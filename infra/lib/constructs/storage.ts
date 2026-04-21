import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class StorageConstruct extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly clipsCdn: cloudfront.IDistribution;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Import existing bucket (already deployed)
    this.bucket = s3.Bucket.fromBucketName(this, 'MainBucket', `frontera-main-602569699510`);

    // Import existing CloudFront distribution
    this.clipsCdn = cloudfront.Distribution.fromDistributionAttributes(this, 'ClipsCdn', {
      distributionId: cdk.Fn.importValue('FronteraStack-ClipsCdnDistId') as unknown as string,
      domainName: 'd25yrx00pth40q.cloudfront.net',
    });
  }
}
