import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

export type FronteraIngestConfig = {
  vpcId: string;
  privateSubnetIds: string[];
  availabilityZones: string[];
  lambdaSecurityGroupId: string;
  dbSecretArn: string;
  rawBucketName?: string;
};

export type IngestStackProps = cdk.StackProps & {
  frontera: FronteraIngestConfig;
};

/**
 * Daily RSS ingest (Lambda + EventBridge).
 *
 * NAT: This Lambda runs in **private** subnets for RDS. Those subnets must route 0.0.0.0/0 to a NAT Gateway
 * (or similar) so the runtime can reach **public RSS URLs** over HTTPS. Subnets that are private without NAT
 * can reach RDS but not the public internet.
 */
export class IngestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IngestStackProps) {
    super(scope, id, props);
    const f = props.frontera;

    const backendRoot = path.join(process.cwd(), '..', 'backend');

    const vpc = ec2.Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: f.vpcId,
      availabilityZones: f.availabilityZones,
      privateSubnetIds: f.privateSubnetIds,
    });

    const subnets = f.privateSubnetIds.map((subnetId, i) =>
      ec2.Subnet.fromSubnetAttributes(this, `IngestSubnet${i}`, {
        subnetId,
        availabilityZone: f.availabilityZones[i],
      }),
    );

    const lambdaSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'LambdaSg', f.lambdaSecurityGroupId);

    const ingestFn = new nodejs.NodejsFunction(this, 'IngestFunction', {
      entry: path.join(backendRoot, 'src', 'handlers', 'ingest.ts'),
      handler: 'handler',
      projectRoot: backendRoot,
      depsLockFilePath: path.join(backendRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      vpc,
      vpcSubnets: { subnets },
      securityGroups: [lambdaSg],
      environment: {
        DB_SECRET_ARN: f.dbSecretArn,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...(f.rawBucketName ? { RAW_BUCKET: f.rawBucketName } : {}),
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    const secret = secretsmanager.Secret.fromSecretCompleteArn(this, 'DbSecret', f.dbSecretArn);
    secret.grantRead(ingestFn);

    if (f.rawBucketName) {
      const bucket = s3.Bucket.fromBucketName(this, 'RawBucket', f.rawBucketName);
      bucket.grantPut(ingestFn);
    }

    new events.Rule(this, 'DailyIngest', {
      // 08:00 UTC daily (EventBridge cron: minute hour day-of-month month day-of-week year)
      schedule: events.Schedule.expression('cron(0 8 * * ? *)'),
      description: 'Runs Frontera RSS ingest daily at 08:00 UTC.',
    }).addTarget(new targets.LambdaFunction(ingestFn));

    this.templateOptions.description =
      'Frontera ingest: EventBridge -> Lambda (RSS). Lambda requires NAT in private subnets for public RSS HTTPS.';
  }
}
