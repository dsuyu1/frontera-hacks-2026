import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StorageConstruct } from './constructs/storage';
import { DatabaseConstruct } from './constructs/database';
import { ApiConstruct } from './constructs/api';
import { PipelineConstruct } from './constructs/pipeline';

export class FronteraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const storage = new StorageConstruct(this, 'Storage');
    const database = new DatabaseConstruct(this, 'Database');
    const api = new ApiConstruct(this, 'Api', { database, storage });
    new PipelineConstruct(this, 'Pipeline', { database, storage });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'ClipsCdnUrl', {
      value: `https://${storage.clipsCdn.distributionDomainName}`,
    });
  }
}
