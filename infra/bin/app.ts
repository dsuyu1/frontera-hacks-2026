#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { IngestStack } from '../lib/ingest-stack';

/**
 * Run CDK from the `infra/` directory (`cd infra && cdk synth`) so paths resolve to ../backend.
 *
 * Required context key `frontera`:
 * - vpcId, privateSubnetIds, availabilityZones, lambdaSecurityGroupId, dbSecretArn
 * - optional rawBucketName for RSS XML snapshots to S3
 *
 * Ingest Lambda is placed in private subnets (RDS access). For HTTPS fetches to public RSS feeds,
 * the subnets need a route to a NAT Gateway (or another outbound path). See stack template description.
 */
const app = new cdk.App();

const cfg = app.node.tryGetContext('frontera') as
  | {
      vpcId?: string;
      privateSubnetIds?: string[];
      availabilityZones?: string[];
      lambdaSecurityGroupId?: string;
      dbSecretArn?: string;
      rawBucketName?: string;
    }
  | undefined;

if (
  !cfg?.vpcId ||
  !cfg?.privateSubnetIds?.length ||
  !cfg?.availabilityZones?.length ||
  cfg.privateSubnetIds.length !== cfg.availabilityZones.length ||
  !cfg?.lambdaSecurityGroupId ||
  !cfg?.dbSecretArn
) {
  throw new Error(
    'Set CDK context "frontera" with vpcId, privateSubnetIds, availabilityZones (same length as subnets), lambdaSecurityGroupId, dbSecretArn. See cdk.json.',
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
    rawBucketName: cfg.rawBucketName?.trim() || undefined,
  },
});
