import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import type { Construct } from 'constructs';

export type FronteraIngestConfig = {
  vpcId: string;
  privateSubnetIds: string[];
  availabilityZones: string[];
  lambdaSecurityGroupId: string;
  dbSecretArn: string;
  s3BucketName: string;
  cdnDomain: string;
  rawBucketName?: string;
  ytdlpLayerArn?: string;
};

export type IngestStackProps = cdk.StackProps & {
  frontera: FronteraIngestConfig;
};

export class IngestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IngestStackProps) {
    super(scope, id, props);
    const f = props.frontera;
    const backendRoot = path.join(process.cwd(), '..', 'backend');

    // ── Networking ────────────────────────────────────────────────────────────
    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: f.vpcId,
      availabilityZones: f.availabilityZones,
      privateSubnetIds: f.privateSubnetIds,
    });

    const subnets = f.privateSubnetIds.map((subnetId, i) =>
      ec2.Subnet.fromSubnetAttributes(this, `Subnet${i}`, {
        subnetId,
        availabilityZone: f.availabilityZones[i],
      }),
    );

    const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'LambdaSg', f.lambdaSecurityGroupId);
    const vpcConfig = { vpc, vpcSubnets: { subnets }, securityGroups: [lambdaSg] };

    // ── Shared resources ──────────────────────────────────────────────────────
    const secret = secretsmanager.Secret.fromSecretCompleteArn(this, 'DbSecret', f.dbSecretArn);
    const bucket = s3.Bucket.fromBucketName(this, 'MainBucket', f.s3BucketName);

    const bedrockPolicy = new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: ['*'],
    });

    const commonEnv = {
      DB_SECRET_ARN: f.dbSecretArn,
      S3_BUCKET: f.s3BucketName,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
    };

    const bundling = { minify: true, sourceMap: true };

    function makeFn(
      scope: Construct,
      id: string,
      entry: string,
      extra?: {
        timeout?: cdk.Duration;
        memorySize?: number;
        environment?: Record<string, string>;
        layers?: lambda.ILayerVersion[];
      },
    ) {
      return new nodejs.NodejsFunction(scope, id, {
        entry: path.join(backendRoot, 'src', 'handlers', entry),
        handler: 'handler',
        projectRoot: backendRoot,
        depsLockFilePath: path.join(backendRoot, 'package-lock.json'),
        runtime: lambda.Runtime.NODEJS_20_X,
        timeout: extra?.timeout ?? cdk.Duration.minutes(5),
        memorySize: extra?.memorySize ?? 512,
        ...vpcConfig,
        environment: { ...commonEnv, ...extra?.environment },
        layers: extra?.layers,
        bundling,
      });
    }

    // ── yt-dlp layer (optional) ───────────────────────────────────────────────
    const ytdlpLayers: lambda.ILayerVersion[] = [];
    if (f.ytdlpLayerArn) {
      ytdlpLayers.push(
        lambda.LayerVersion.fromLayerVersionArn(this, 'YtdlpLayer', f.ytdlpLayerArn),
      );
    }

    // ── Pipeline Lambdas ──────────────────────────────────────────────────────
    const videoAcquireFn = makeFn(this, 'VideoAcquireFunction', 'video-acquire.ts', {
      timeout: cdk.Duration.minutes(5),
      layers: ytdlpLayers,
    });
    secret.grantRead(videoAcquireFn);
    bucket.grantWrite(videoAcquireFn);

    const transcribeFn = makeFn(this, 'TranscribeFunction', 'transcribe.ts', {
      timeout: cdk.Duration.minutes(2),
    });
    secret.grantRead(transcribeFn);
    bucket.grantReadWrite(transcribeFn);
    transcribeFn.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'transcribe:StartTranscriptionJob',
        'transcribe:GetTranscriptionJob',
      ],
      resources: ['*'],
    }));
    // Transcribe needs to read from and write to S3 on our behalf
    transcribeFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [`arn:aws:s3:::${f.s3BucketName}/*`],
    }));

    const segmentFn = makeFn(this, 'SegmentFunction', 'segment.ts', {
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
    });
    secret.grantRead(segmentFn);
    bucket.grantRead(segmentFn);
    segmentFn.addToRolePolicy(bedrockPolicy);

    const clipFn = makeFn(this, 'ClipFunction', 'clip.ts');
    secret.grantRead(clipFn);

    const publishFn = makeFn(this, 'PublishFunction', 'publish.ts', {
      timeout: cdk.Duration.minutes(5),
    });
    secret.grantRead(publishFn);
    publishFn.addToRolePolicy(bedrockPolicy);

    // ── Step Functions state machine ──────────────────────────────────────────
    const videoAcquireTask = new tasks.LambdaInvoke(this, 'VideoAcquire', {
      lambdaFunction: videoAcquireFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(10) });

    const transcribeStartTask = new tasks.LambdaInvoke(this, 'TranscribeStart', {
      lambdaFunction: transcribeFn,
      payload: sfn.TaskInput.fromObject({ 'video_id.$': '$.video_id', action: 'start' }),
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(5) });

    const transcribeCheckTask = new tasks.LambdaInvoke(this, 'TranscribeCheck', {
      lambdaFunction: transcribeFn,
      payload: sfn.TaskInput.fromObject({ 'video_id.$': '$.video_id', action: 'check' }),
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(5) });

    const waitForTranscription = new sfn.Wait(this, 'WaitForTranscription', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    const segmentTask = new tasks.LambdaInvoke(this, 'Segment', {
      lambdaFunction: segmentFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(30) });

    const clipTask = new tasks.LambdaInvoke(this, 'Clip', {
      lambdaFunction: clipFn,
      outputPath: '$.Payload',
    });

    const publishTask = new tasks.LambdaInvoke(this, 'Publish', {
      lambdaFunction: publishFn,
      outputPath: '$.Payload',
    }).addRetry({ maxAttempts: 2, interval: cdk.Duration.seconds(10) });

    const pipelineSuccess = new sfn.Succeed(this, 'PipelineSuccess');

    // Wire pipeline: segment → clip → publish → done
    publishTask.next(pipelineSuccess);
    clipTask.next(publishTask);
    segmentTask.next(clipTask);

    // Transcription polling loop
    const transcribeDoneChoice = new sfn.Choice(this, 'TranscribeDone?')
      .when(sfn.Condition.stringEquals('$.status', 'completed'), segmentTask)
      .otherwise(waitForTranscription);
    transcribeCheckTask.next(transcribeDoneChoice);
    waitForTranscription.next(transcribeCheckTask);

    // After start: YouTube returns 'completed' immediately; non-YT enters poll loop
    const transcribeImmediateChoice = new sfn.Choice(this, 'TranscribeImmediate?')
      .when(sfn.Condition.stringEquals('$.status', 'completed'), segmentTask)
      .otherwise(transcribeCheckTask);
    transcribeStartTask.next(transcribeImmediateChoice);

    videoAcquireTask.next(transcribeStartTask);

    const pipeline = new sfn.StateMachine(this, 'VideoPipeline', {
      definitionBody: sfn.DefinitionBody.fromChainable(videoAcquireTask),
      timeout: cdk.Duration.hours(4),
      comment: 'Frontera: acquire → transcribe → segment → clip → publish',
    });

    // ── Ingest Lambda ─────────────────────────────────────────────────────────
    const ingestFn = makeFn(this, 'IngestFunction', 'ingest.ts', {
      environment: {
        PIPELINE_SM_ARN: pipeline.stateMachineArn,
        ...(f.rawBucketName ? { RAW_BUCKET: f.rawBucketName } : {}),
      },
    });
    secret.grantRead(ingestFn);
    pipeline.grantStartExecution(ingestFn);
    if (f.rawBucketName) {
      s3.Bucket.fromBucketName(this, 'RawBucket', f.rawBucketName).grantPut(ingestFn);
    }

    new events.Rule(this, 'DailyIngest', {
      schedule: events.Schedule.expression('cron(0 8 * * ? *)'),
      description: 'Runs Frontera RSS ingest daily at 08:00 UTC.',
    }).addTarget(new targets.LambdaFunction(ingestFn));

    // ── API Lambda + Function URL ──────────────────────────────────────────────
    const apiFn = makeFn(this, 'ApiFunction', 'api.ts', {
      timeout: cdk.Duration.seconds(29),
      environment: {
        CLIPS_CDN_DOMAIN: f.cdnDomain,
        PIPELINE_SM_ARN: pipeline.stateMachineArn,
        // Reuse the same state machine for per-video manual triggers
        PIPELINE_VIDEO_SM_ARN: pipeline.stateMachineArn,
      },
    });
    secret.grantRead(apiFn);
    bucket.grantRead(apiFn);
    apiFn.addToRolePolicy(bedrockPolicy);
    pipeline.grantStartExecution(apiFn);

    const apiUrl = apiFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // ── Article-fetch Lambda (NOT in VPC — needs public internet access) ───────
    // The API Lambda lives in private subnets for DB access; without a NAT Gateway
    // it cannot reach external URLs.  This separate Lambda has no VPC attachment so
    // it can freely fetch article HTML and OG images from news sites.
    const articleFn = new nodejs.NodejsFunction(this, 'ArticleFunction', {
      entry: path.join(backendRoot, 'src', 'handlers', 'article.ts'),
      handler: 'handler',
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
      // No vpcConfig — intentionally public so it can reach external URLs
      bundling,
    });

    const articleUrl = articleFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.GET],
        allowedHeaders: ['*'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiUrl.url,
      description: 'Set NEXT_PUBLIC_API_URL to this value (without trailing slash)',
    });
    new cdk.CfnOutput(this, 'ArticleUrl', {
      value: articleUrl.url,
      description: 'Set NEXT_PUBLIC_ARTICLE_URL to this value (without trailing slash)',
    });
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: pipeline.stateMachineArn,
      description: 'Step Functions state machine ARN',
    });
  }
}
