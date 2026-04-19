#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IngestStack } from '../lib/ingest-stack';

const app = new cdk.App();

const cfg = app.node.tryGetContext('frontera') as
  | {
      vpcId?: string;
      privateSubnetIds?: string[];
      availabilityZones?: string[];
      lambdaSecurityGroupId?: string;
      dbSecretArn?: string;
      s3BucketName?: string;
      cdnDomain?: string;
      rawBucketName?: string;
      ytdlpLayerArn?: string;
    }
  | undefined;

if (
  !cfg?.vpcId ||
  !cfg?.privateSubnetIds?.length ||
  !cfg?.availabilityZones?.length ||
  cfg.privateSubnetIds.length !== cfg.availabilityZones.length ||
  !cfg?.lambdaSecurityGroupId ||
  !cfg?.dbSecretArn ||
  !cfg?.s3BucketName ||
  !cfg?.cdnDomain
) {
  throw new Error(
    'Set CDK context "frontera" with: vpcId, privateSubnetIds, availabilityZones, lambdaSecurityGroupId, dbSecretArn, s3BucketName, cdnDomain. See cdk.json.',
  );
}

new IngestStack(app, 'FronteraIngestStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  frontera: {
    vpcId: cfg.vpcId,
    privateSubnetIds: cfg.privateSubnetIds,
    availabilityZones: cfg.availabilityZones,
    lambdaSecurityGroupId: cfg.lambdaSecurityGroupId,
    dbSecretArn: cfg.dbSecretArn,
    s3BucketName: cfg.s3BucketName,
    cdnDomain: cfg.cdnDomain,
    rawBucketName: cfg.rawBucketName?.trim() || undefined,
    ytdlpLayerArn: cfg.ytdlpLayerArn?.trim() || undefined,
  },
});
