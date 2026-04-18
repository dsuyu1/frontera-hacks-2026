import * as cdk from 'aws-cdk-lib';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './database';
import { StorageConstruct } from './storage';

interface ApiProps {
  database: DatabaseConstruct;
  storage: StorageConstruct;
}

export class ApiConstruct extends Construct {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const { database, storage } = props;

    const commonEnv = {
      DB_SECRET_ARN: database.dbSecret.secretArn,
      DB_CLUSTER_ARN: database.cluster.clusterArn,
      S3_BUCKET: storage.bucket.bucketName,
      CLIPS_CDN_DOMAIN: storage.clipsCdn.distributionDomainName,
    };

    const handlerFn = new lambda.Function(this, 'ApiHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => ({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Frontera API stub — replace with real handler' }),
        });
      `),
      vpc: database.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [database.lambdaSg],
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
    });

    database.dbSecret.grantRead(handlerFn);
    storage.bucket.grantReadWrite(handlerFn);

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'frontera-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
      },
    });

    const integration = new integrations.HttpLambdaIntegration('HandlerInteg', handlerFn);

    const routes = [
      { method: apigwv2.HttpMethod.GET, path: '/localities' },
      { method: apigwv2.HttpMethod.GET, path: '/categories' },
      { method: apigwv2.HttpMethod.GET, path: '/feed' },
      { method: apigwv2.HttpMethod.GET, path: '/feed/{id}' },
      { method: apigwv2.HttpMethod.GET, path: '/clips/{id}' },
      { method: apigwv2.HttpMethod.POST, path: '/users/preferences' },
    ];

    for (const route of routes) {
      this.httpApi.addRoutes({ path: route.path, methods: [route.method], integration });
    }
  }
}
