import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamoDB from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface HitCounterProps {
    downstream: lambda.IFunction;

    readCapacity?: number;
}

export class HitCounter extends Construct {

    public readonly handler: lambda.Function;

    public readonly table: dynamoDB.Table;

    constructor(scope: Construct, id: string, props: HitCounterProps) {
        if (props.readCapacity !== undefined && (props.readCapacity < 5 || props.readCapacity > 20)) {
            throw new Error('readCapacity must be greater than 5 and less than 20');
        }
        super(scope, id);

        const table = new dynamoDB.Table(this, 'Hits', {
            partitionKey: { name: 'path', type: dynamoDB.AttributeType.STRING },
            encryption: dynamoDB.TableEncryption.AWS_MANAGED,
            readCapacity: props.readCapacity ?? 5,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        this.table = table

        this.handler = new lambda.Function(this, 'HitCounterHandler', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'hitcounter.handler',
            code: lambda.Code.fromAsset('lambda'),
            environment: {
                DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
                HITS_TABLE_NAME: table.tableName
            }
        });

        table.grantReadWriteData(this.handler);

        props.downstream.grantInvoke(this.handler);

    }
}