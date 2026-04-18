#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { FronteraStack } from '../lib/frontera-stack';

const app = new cdk.App();
new FronteraStack(app, 'FronteraStack', {
  env: { account: '602569699510', region: 'us-east-1' },
});
