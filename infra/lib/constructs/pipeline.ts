import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './database';
import { StorageConstruct } from './storage';

interface PipelineProps {
  database: DatabaseConstruct;
  storage: StorageConstruct;
}

const stubCode = (name: string) =>
  lambda.Code.fromInline(`
    exports.handler = async (event) => {
      console.log('${name} stub received:', JSON.stringify(event));
      return { status: 'ok', step: '${name}' };
    };
  `);

export class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props: PipelineProps) {
    super(scope, id);

    const { database, storage } = props;

    const commonEnv = {
      DB_SECRET_ARN: database.dbSecret.secretArn,
      S3_BUCKET: storage.bucket.bucketName,
    };

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      vpc: database.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [database.lambdaSg],
      environment: commonEnv,
      timeout: cdk.Duration.minutes(5),
    };

    // Step 1 — ingest sources (scrape websites, RSS, YouTube channel discovery)
    const ingestFn = new lambda.Function(this, 'IngestFn', {
      ...commonLambdaProps,
      code: stubCode('ingest'),
      description: 'Discover new items from configured source connectors',
    });

    // Step 2 — video acquisition trigger (kicks off Fargate; stub returns task ARN)
    const videoAcquireFn = new lambda.Function(this, 'VideoAcquireFn', {
      ...commonLambdaProps,
      code: stubCode('video-acquire'),
      description: 'Trigger Fargate task to download video to S3 via yt-dlp',
    });

    // Step 3 — start Amazon Transcribe job
    const transcribeFn = new lambda.Function(this, 'TranscribeFn', {
      ...commonLambdaProps,
      code: stubCode('transcribe'),
      description: 'Start Amazon Transcribe job and store transcript JSON in S3',
    });
    transcribeFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['transcribe:StartTranscriptionJob', 'transcribe:GetTranscriptionJob'],
        resources: ['*'],
      }),
    );

    // Step 4 — segment selection via Bedrock
    const segmentFn = new lambda.Function(this, 'SegmentFn', {
      ...commonLambdaProps,
      timeout: cdk.Duration.minutes(10),
      code: stubCode('segment'),
      description: 'Use Bedrock (Claude Haiku) to select 1 best segment per 30-min window',
    });
    segmentFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    // Step 5 — clip generation trigger (Fargate + ffmpeg)
    const clipFn = new lambda.Function(this, 'ClipFn', {
      ...commonLambdaProps,
      code: stubCode('clip'),
      description: 'Trigger Fargate task to cut clip with ffmpeg and upload to S3',
    });

    // Step 6 — publish feed items to DB
    const publishFn = new lambda.Function(this, 'PublishFn', {
      ...commonLambdaProps,
      code: stubCode('publish'),
      description: 'Write Clip + FeedItem records to Postgres and mark items ready',
    });

    // Grant S3 + Secrets access to all pipeline Lambdas
    for (const fn of [ingestFn, videoAcquireFn, transcribeFn, segmentFn, clipFn, publishFn]) {
      storage.bucket.grantReadWrite(fn);
      database.dbSecret.grantRead(fn);
    }

    // Step Functions state machine
    const ingestStep = new tasks.LambdaInvoke(this, 'Ingest', { lambdaFunction: ingestFn, outputPath: '$.Payload' });
    const acquireStep = new tasks.LambdaInvoke(this, 'Acquire', { lambdaFunction: videoAcquireFn, outputPath: '$.Payload' });
    const transcribeStep = new tasks.LambdaInvoke(this, 'Transcribe', { lambdaFunction: transcribeFn, outputPath: '$.Payload' });
    const segmentStep = new tasks.LambdaInvoke(this, 'Segment', { lambdaFunction: segmentFn, outputPath: '$.Payload' });
    const clipStep = new tasks.LambdaInvoke(this, 'Clip', { lambdaFunction: clipFn, outputPath: '$.Payload' });
    const publishStep = new tasks.LambdaInvoke(this, 'Publish', { lambdaFunction: publishFn, outputPath: '$.Payload' });

    const definition = ingestStep
      .next(acquireStep)
      .next(transcribeStep)
      .next(segmentStep)
      .next(clipStep)
      .next(publishStep);

    const stateMachine = new sfn.StateMachine(this, 'DailyPipeline', {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineName: 'frontera-daily-pipeline',
      timeout: cdk.Duration.hours(4),
      tracingEnabled: true,
    });

    // EventBridge rule — fires daily at 03:00 UTC
    new events.Rule(this, 'DailyTrigger', {
      schedule: events.Schedule.cron({ hour: '3', minute: '0' }),
      targets: [new targets.SfnStateMachine(stateMachine)],
      description: 'Trigger Frontera daily batch pipeline',
    });
  }
}
