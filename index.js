import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as gcp from "@pulumi/gcp";
import yaml from "js-yaml";
import * as fs from "fs";

const stack = pulumi.getStack();
const configFile = fs.readFileSync(`Pulumi.${stack}.yaml`, "utf8");
const config = yaml.safeLoad(configFile);

// Creating VPC
const myvpc = new aws.ec2.Vpc(config.config["iac-pulumi:vpc_name"], {
  cidrBlock: config.config["iac-pulumi:vpc_cidrBlock"],
  tags: {
    Name: config.config["iac-pulumi:vpc_name"],
  },
});

// Creating subnet

// Create public subnets
const iam_publicSubnets = [];
const iam_privateSubnets = [];
const available = aws.getAvailabilityZones({
  state: "available",
});

available.then((available) => {
  const zoneCount = Math.min(
    available.names?.length || 0,
    parseInt(config.config["iac-pulumi:no_of_max_subnets"])
  );
  const arr = config.config["iac-pulumi:sub_cidr"].split(".");
  for (let i = 0; i < zoneCount; i++) {
    // Create public subnets

    const subpubName = config.config["iac-pulumi:public_subnet_name"] + i;
    console.log(subpubName);
    const subpubCidr = arr[0] + "." + arr[1] + "." + i + "." + arr[3];
    const publicsubnet = new aws.ec2.Subnet(subpubName, {
      vpcId: myvpc.id,
      availabilityZone: available.names?.[i],
      cidrBlock: subpubCidr,
      mapPublicIpOnLaunch: true,
      tags: {
        Name: subpubName,
      },
    });

    iam_publicSubnets.push(publicsubnet);

    const host = i + zoneCount;
    // Create private subnets
    const subpriCidr = arr[0] + "." + arr[1] + "." + host + "." + arr[3];
    const subPrivateName = config.config["iac-pulumi:private_subnet_name"] + i;
    const privatesubnet = new aws.ec2.Subnet(subPrivateName, {
      vpcId: myvpc.id,
      availabilityZone: available.names?.[i],
      cidrBlock: subpriCidr,
      tags: {
        Name: subPrivateName,
      },
    });

    iam_privateSubnets.push(privatesubnet);
  }

  // Creating internet gateway
  const internet = new aws.ec2.InternetGateway(
    config.config["iac-pulumi:internet_gateway_name"],
    {
      vpcId: myvpc.id,
      tags: {
        Name: config.config["iac-pulumi:internet_gateway_name"],
      },
    }
  );

  // Create a public route table
  const publicRouteTable = new aws.ec2.RouteTable(
    config.config["iac-pulumi:public_route_table_name"],
    {
      vpcId: myvpc.id,
      tags: {
        Name: config.config["iac-pulumi:public_route_table_name"],
      },
    }
  );

  // Attach all public subnets to the public route table
  iam_publicSubnets.forEach((subnet, index) => {
    let pubAssociationNmae =
      config.config["iac-pulumi:public_association_name"] + index;
    const routeTable = new aws.ec2.RouteTableAssociation(pubAssociationNmae, {
      routeTableId: publicRouteTable.id,
      subnetId: subnet.id,
    });
  });

  // Create a private route table
  const privRouteTable = new aws.ec2.RouteTable(
    config.config["iac-pulumi:private_route_table_name"],
    {
      vpcId: myvpc.id,
      tags: {
        Name: config.config["iac-pulumi:private_route_table_name"],
      },
    }
  );

  // Attach all private subnets to the private route table
  iam_privateSubnets.forEach((subnet, index) => {
    let priAssociationNmae =
      config.config["iac-pulumi:private_association_name"] + index;
    const routeTable = new aws.ec2.RouteTableAssociation(priAssociationNmae, {
      routeTableId: privRouteTable.id,
      subnetId: subnet.id,
    });
  });

  const publicRoute = new aws.ec2.Route(
    config.config["iac-pulumi:public_route_name"],
    {
      routeTableId: publicRouteTable.id,
      destinationCidrBlock: config.config["iac-pulumi:route_to_internet"],
      gatewayId: internet.id,
      tags: {
        Name: config.config["iac-pulumi:public_route_name"],
      },
    }
  );

  // Create Load Balancer Security Group
  const lbSecurityGroup = new aws.ec2.SecurityGroup(
    "loadBalancerSecurityGroup",
    {
      vpcId: myvpc.id,
      description: "Security group for the load balancer",
      ingress: [
        {
          fromPort:
            config.config["iac-pulumi:lb_security_group_https_fromPort"],
          toPort: config.config["iac-pulumi:lb_security_group_https_toPort"],
          protocol:
            config.config["iac-pulumi:lb_security_group_https_protocol"],
          cidrBlocks: [
            config.config["iac-pulumi:lb_security_group_https_cidrBlocks"],
          ],
        },
      ],
      egress: [
        {
          fromPort:
            config.config["iac-pulumi:lb_security_group_egress_fromPort"],
          toPort: config.config["iac-pulumi:lb_security_group_egress_toPort"],
          protocol:
            config.config["iac-pulumi:lb_security_group_egress_protocol"],
          cidrBlocks: [
            config.config["iac-pulumi:lb_security_group_egress_cidrBlocks"],
          ],
        },
      ],
    }
  );

  // Create an EC2 security group for web applications
  const appSecurityGroup = new aws.ec2.SecurityGroup(
    config.config["iac-pulumi:security_group_name"],
    {
      vpcId: myvpc.id,
      description: "Security group for web applications",
      ingress: [
        {
          fromPort: config.config["iac-pulumi:ssh_from_port"], //SSH
          toPort: config.config["iac-pulumi:ssh_to_port"],
          protocol: config.config["iac-pulumi:protocol"],
          securityGroups: [lbSecurityGroup.id],
          cidrBlocks: [config.config["iac-pulumi:ssh_ip"]],
        },
        //   {
        //     fromPort: config.config['iac-pulumi:http_from_port'], //HTTP
        //     toPort: config.config['iac-pulumi:http_to_port'],
        //     protocol: config.config['iac-pulumi:protocol'],
        //     cidrBlocks: [config.config['iac-pulumi:cidr_blocks']],
        //     ipv6CidrBlocks: [config.config['iac-pulumi:ipv6_cidr_blocks']],
        //   },
        //   {
        //     fromPort: config.config['iac-pulumi:https_from_port'], //HTTPS
        //     toPort: config.config['iac-pulumi:https_to_port'],
        //     protocol: config.config['iac-pulumi:protocol'],
        //     cidrBlocks: [config.config['iac-pulumi:cidr_blocks']],
        //     ipv6CidrBlocks: [config.config['iac-pulumi:ipv6_cidr_blocks']],
        //   },
        {
          fromPort: config.config["iac-pulumi:your_from_port"], //your port
          toPort: config.config["iac-pulumi:your_to_port"],
          protocol: config.config["iac-pulumi:protocol"],
          cidrBlocks: [config.config["iac-pulumi:cidr_blocks"]],
          securityGroups: [lbSecurityGroup.id],
          // ipv6CidrBlocks: [config.config['iac-pulumi:ipv6_cidr_blocks']],
        },
      ],
      egress: [
        {
          fromPort:
            config.config["iac-pulumi:db_security_group_egress_fromPort"],
          toPort: config.config["iac-pulumi:db_security_group_egress_toPort"],
          protocol:
            config.config["iac-pulumi:db_security_group_egress_protocol"],
          cidrBlocks: [
            config.config["iac-pulumi:db_security_group_egress_cidrBlocks"],
          ],
        },
      ],
      tags: {
        Name: config.config["iac-pulumi:security_group_name"],
      },
    }
  );

  const ami = aws.ec2.getAmi({
    filters: [
      {
        name: config.config["iac-pulumi:ami_name"],
        values: [config.config["iac-pulumi:ami_name_value"]],
      },
      {
        name: config.config["iac-pulumi:root_device_type_tag"],
        values: [config.config["iac-pulumi:root_device_type_tag_value"]],
      },
      {
        name: config.config["iac-pulumi:virtualization_tag"],
        values: [config.config["iac-pulumi:virtualization_tag_value"]],
      },
    ],
    mostRecent: true,
    owners: [config.config["iac-pulumi:owner"]],
  });

  // Database Security Group
  const dbSecurityGroup = new aws.ec2.SecurityGroup(
    config.config["iac-pulumi:db_security_group_name"],
    {
      vpcId: myvpc.id,
      ingress: [
        {
          fromPort:
            config.config["iac-pulumi:db_security_group_ingress_fromPort"],
          toPort: config.config["iac-pulumi:db_security_group_ingress_toPort"],
          protocol:
            config.config["iac-pulumi:db_security_group_ingress_protocol"],
          securityGroups: [appSecurityGroup.id],
        },
      ],
      egress: [
        {
          fromPort:
            config.config["iac-pulumi:db_security_group_egress_fromPort"],
          toPort: config.config["iac-pulumi:db_security_group_egress_toPort"],
          protocol:
            config.config["iac-pulumi:db_security_group_egress_protocol"],
          cidrBlocks: [
            config.config["iac-pulumi:db_security_group_egress_cidrBlocks"],
          ],
        },
      ],
      tags: {
        Name: config.config["iac-pulumi:db_security_group_name"],
      },
    }
  );

  // RDS Parameter Group
  const dbParameterGroup = new aws.rds.ParameterGroup(
    config.config["iac-pulumi:rds_parameter_group_name"],
    {
      family: config.config["iam-pulumi:rdsParameterGroup_family"],
      vpcId: myvpc.id,
      parameters: [
        {
          name: config.config["iam-pulumi:rdsParameterGroup_parameters_name"],
          value: config.config["iam-pulumi:rdsParameterGroup_parameters_value"],
        },
      ],
    }
  );

  // Create a DB subnet group for RDS instances
  const dbSubnetGroup = new aws.rds.SubnetGroup(
    config.config["iac-pulumi:rds_db_subnet_group_name"],
    {
      subnetIds: iam_privateSubnets.map((subnet) => subnet.id),
      tags: {
        Name: config.config["iac-pulumi:rds_db_subnet_group_name"],
      },
    }
  );

  // RDS Instance
  const dbInstance = new aws.rds.Instance(
    config.config["iac-pulumi:rds_dbinstance"],
    {
      allocatedStorage:
        config.config["iac-pulumi:rds_dbinstance_allocatedStorage"],
      storageType: config.config["iac-pulumi:rds_dbinstance_storageType"],
      engine: config.config["iac-pulumi:rds_dbinstance_engine"],
      engineVersion: config.config["iac-pulumi:rds_dbinstance_engineVersion"],
      skipFinalSnapshot:
        config.config["iac-pulumi:rds_dbinstance_skipFinalSnapshot"],
      instanceClass: config.config["iac-pulumi:rds_dbinstance_instanceClass"],
      multiAz: config.config["iac-pulumi:rds_dbinstance_multiAz"],
      dbName: config.config["iac-pulumi:rds_dbinstance_dbName"],
      username: config.config["iac-pulumi:rds_dbinstance_username"],
      password: config.config["iac-pulumi:rds_dbinstance_password"],
      parameterGroupName: dbParameterGroup.name,
      dbSubnetGroupName: dbSubnetGroup,
      vpcSecurityGroupIds: [dbSecurityGroup.id],
      publiclyAccessible:
        config.config["iac-pulumi:rds_dbinstance_publiclyAccessible"],
    }
  );

  dbInstance.endpoint.apply((endpoint) => {
    const IAMRole = new aws.iam.Role("IAM", {
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: config.config["iac-pulumi:IAM_POLICY_action"],
            Effect: config.config["iac-pulumi:IAM_POLICY_effect"],
            Principal: {
              Service: [
                config.config["iac-pulumi:IAM_POLICY_Principal_Service"],
                "lambda.amazonaws.com",
              ],
            },
          },
        ],
      }),
    });

    const policy = new aws.iam.PolicyAttachment(
      config.config["iac-pulumi:IAM_POLICY"],
      {
        policyArn: config.config["iac-pulumi:IAM_POLICY_ARN"],
        roles: [IAMRole.name],
      }
    );

    const lambdapolicy = new aws.iam.PolicyAttachment("lambda-policy", {
      policyArn: "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
      roles: [IAMRole.name],
    });

    const snsPolicy = new aws.iam.PolicyAttachment("sns-policy", {
      policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
      roles: [IAMRole.name],
    });

    const dynamodbPolicy = new aws.iam.PolicyAttachment("dynamodb-policy", {
      policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
      roles: [IAMRole.name],
    });

    const roleAttachment = new aws.iam.InstanceProfile(
      config.config["iac-pulumi:IAM_POLICY_instance_profile"],
      {
        role: IAMRole.name,
      }
    );

    const snsTopic = new aws.sns.Topic("webappTopic", {
      displayName: "webappTopic",
      fifoTopic: false,
    });

    const gcpBucket = new gcp.storage.Bucket("gcp-bucket-webapp-csye6225new", {
      forceDestroy: true,
      location: config.config["iac-pulumi:gcpBucket_location"],
      project: config.config["iac-pulumi:gcpBucket_project"],
    });

    const gcpServiceAccount = new gcp.serviceaccount.Account(
      "gcpserviceaccount",
      {
        Name: "gcpserviceaccount",
        accountId: "gcpserviceaccount",
        project: config.config["iac-pulumi:gcpBucket_project"],
      }
    );

    const roleBinding = new gcp.projects.IAMBinding("binding", {
      project: config.config["iac-pulumi:gcpBucket_project"],
      members: [
        gcpServiceAccount.email.apply((email) => `serviceAccount:${email}`),
      ],
      role: "roles/storage.objectUser",
    });

    const serviceKey = new gcp.serviceaccount.Key("serviceKey", {
      serviceAccountId: gcpServiceAccount.id,
    });

    const dynamoDB = new aws.dynamodb.Table("dynamodb", {
      attributes: [
        {
          name: "id",
          type: "S",
        },
      ],
      hashKey: "id",
      writeCapacity: 20,
      readCapacity: 20,
    });

    const lambdaCode = new pulumi.asset.AssetArchive({
      ".": new pulumi.asset.FileArchive(
        config.config["iac-pulumi:lambdaCode_FileArchive"]
      ),
    });

    const lambdaFunction = new aws.lambda.Function("lambdaFunction", {
      code: lambdaCode,
      role: IAMRole.arn,
      handler: "index.handler",
      runtime: "nodejs18.x",
      environment: {
        variables: {
          bucketName: gcpBucket.name,
          privateKey: serviceKey.privateKey.apply((encoded) =>
            Buffer.from(encoded, "base64").toString("ascii")
          ),
          mailgunAPI: config.config["iac-pulumi:lambdafunction_mailgunAPI"],
          mailgunDomain:
            config.config["iac-pulumi:lambdafunction_mailgunDomain"],
          dynamodbName: dynamoDB.name,
        },
      },
    });

    snsTopic.arn.apply((SNSarn) => {
      const lambdaPermissions = new aws.lambda.Permission("Permissions", {
        action: "lambda:InvokeFunction",
        function: lambdaFunction.name,
        principal: "sns.amazonaws.com",
        sourceArn: SNSarn,
      });

      const SnsSubscription = new aws.sns.TopicSubscription("subscription", {
        topic: SNSarn,
        protocol: "lambda",
        endpoint: lambdaFunction.arn,
      });

      const envFile = config.config["iac-pulumi:userData_env_path"];

      const userData = `#!/bin/bash
            echo "host=${endpoint}" >> ${envFile}
            echo "user=${config.config["iac-pulumi:userData_user"]}" >> ${envFile}
            echo "password=${config.config["iac-pulumi:userData_password"]}" >> ${envFile}
            echo "port=${config.config["iac-pulumi:userData_port"]}" >> ${envFile}
            echo "dialect=${config.config["iac-pulumi:userData_dialect"]}" >> ${envFile}
            echo "database=${config.config["iac-pulumi:userData_database"]}" >> ${envFile}
            echo "TopicArn=${SNSarn}" >> ${envFile}
            sudo systemctl restart amazon-cloudwatch-agent
        `;

      // Setup Autoscaling for EC2 Instances
      const launchConfiguration = new aws.ec2.LaunchTemplate(
        "asgLaunchConfig",
        {
          name: "LaunchTemplate",
          imageId: ami.then((i) => i.id), // Your custom AMI
          instanceType: "t2.micro",
          keyName: config.config["iac-pulumi:key_value"],
          securityGroups: [appSecurityGroup.id],
          networkInterfaces: [
            {
              associatePublicIpAddress: true,
              securityGroups: [appSecurityGroup.id],
            },
          ],
          ebsBlockDevices: [
            {
              deviceName: config.config["iac-pulumi:EC2_DEVICE_NAME"],
              deleteOnTermination:
                config.config["iac-pulumi:EC2_DELETE_ON_TERMINATION"],
              volumeSize: config.config["iac-pulumi:EC2_VOLUME_SIZE"],
              volumeType: config.config["iac-pulumi:EC2_VOLUME_TYPE"],
            },
          ],
          iamInstanceProfile: { name: roleAttachment.name },
          userData: Buffer.from(userData).toString("base64"),
        }
      );

      const targetGroup = new aws.lb.TargetGroup(
        config.config["iac-pulumi:targetgroup_tag"],
        {
          port: config.config["iac-pulumi:targetgroup_port"],
          protocol: config.config["iac-pulumi:targetgroup_protocol"],
          targetType: config.config["iac-pulumi:targetgroup_type"],
          vpcId: myvpc.id,
          healthCheck: {
            path: config.config["iac-pulumi:targetgroup_healthcheck_path"],
            interval:
              config.config["iac-pulumi:targetgroup_healthcheck_interval"],
            timeout:
              config.config["iac-pulumi:targetgroup_healthcheck_timeout"],
            healthyThreshold:
              config.config[
                "iac-pulumi:targetgroup_healthcheck_healthyThreshold"
              ],
            unhealthyThreshold:
              config.config[
                "iac-pulumi:targetgroup_healthcheck_unhealthyThreshold"
              ],
            matcher:
              config.config["iac-pulumi:targetgroup_healthcheck_matcher"],
          },
        }
      );

      const autoScalingGroup = new aws.autoscaling.Group(
        config.config["iac-pulumi:autoscalingGroup_tag"],
        {
          name: "autoScalingGroup",
          vpcZoneIdentifiers: iam_publicSubnets,
          desiredCapacity:
            config.config["iac-pulumi:autoscalingGroup_desiredCapacity"],
          targetGroupArns: [targetGroup.arn],
          minSize: config.config["iac-pulumi:autoscalingGroup_minSize"],
          maxSize: config.config["iac-pulumi:autoscalingGroup_maxSize"],
          launchTemplate: {
            id: launchConfiguration.id,
            version: "$Latest",
          },
          tags: [
            {
              key: config.config["iac-pulumi:autoscalingGroup_tag_key"],
              value: config.config["iac-pulumi:autoscalingGroup_tag_value"],
              propagateAtLaunch:
                config.config[
                  "iac-pulumi:autoscalingGroup_tag_propagateAtLaunch"
                ],
            },
          ],
        }
      );

      const scaleUp = new aws.autoscaling.Policy(
        config.config["iac-pulumi:scaleup_tag"],
        {
          cooldown: config.config["iac-pulumi:scaleup_cooldown"],
          scalingAdjustment:
            config.config["iac-pulumi:scaleup_scalingadjustment"],
          adjustmentType:
            config.config["iac-pulumi:scaleup_scalingadjustmenttype"],
          policyType: config.config["iac-pulumi:scaleup_policytype"],
          autoscalingGroupName: autoScalingGroup.name,
        }
      );

      const scaleUpCondition = new aws.cloudwatch.MetricAlarm(
        config.config["iac-pulumi:scaleupcondition_tag"],
        {
          alarmName: config.config["iac-pulumi:scaleupcondition_alarmName"],
          metricName: config.config["iac-pulumi:scaleupcondition_metricName"],
          namespace: config.config["iac-pulumi:scaleupcondition_namespace"],
          statistic: config.config["iac-pulumi:scaleupcondition_statistic"],
          period: config.config["iac-pulumi:scaleupcondition_period"],
          evaluationPeriods:
            config.config["iac-pulumi:scaleupcondition_evaluationPeriods"],
          comparisonOperator:
            config.config["iac-pulumi:scaleupcondition_comparisonOperator"],
          threshold: config.config["iac-pulumi:scaleupcondition_threshold"],
          actionsEnabled:
            config.config["iac-pulumi:scaleupcondition_actionsEnabled"],
          dimensions: {
            AutoScalingGroupName: autoScalingGroup.name,
          },
          alarmActions: [scaleUp.arn],
          tags: {
            Name: config.config["iac-pulumi:scaleupcondition_tag"],
          },
        }
      );

      const scaleDown = new aws.autoscaling.Policy(
        config.config["iac-pulumi:scaledown_tag"],
        {
          cooldown: config.config["iac-pulumi:scaledown_cooldown"],
          scalingAdjustment:
            config.config["iac-pulumi:scaledown_scalingadjustment"],
          adjustmentType:
            config.config["iac-pulumi:scaledown_scalingadjustmenttype"],
          policyType: config.config["iac-pulumi:scaledown_policytype"],
          autoscalingGroupName: autoScalingGroup.name,
          tags: {
            Name: config.config["iac-pulumi:scaledown_tag"],
          },
        }
      );

      const scaleDownCondition = new aws.cloudwatch.MetricAlarm(
        config.config["iac-pulumi:scaledowncondition_tag"],
        {
          alarmName: config.config["iac-pulumi:scaledowncondition_alarmName"],
          metricName: config.config["iac-pulumi:scaledowncondition_metricName"],
          namespace: config.config["iac-pulumi:scaledowncondition_namespace"],
          statistic: config.config["iac-pulumi:scaledowncondition_statistic"],
          period: config.config["iac-pulumi:scaledowncondition_period"],
          evaluationPeriods:
            config.config["iac-pulumi:scaledowncondition_evaluationPeriods"],
          comparisonOperator:
            config.config["iac-pulumi:scaledowncondition_comparisonOperator"],
          threshold: config.config["iac-pulumi:scaledowncondition_threshold"],
          actionsEnabled:
            config.config["iac-pulumi:scaledowncondition_actionsEnabled"],
          dimensions: {
            AutoScalingGroupName: autoScalingGroup.name,
          },
          alarmActions: [scaleDown.arn],
          tags: {
            Name: config.config["iac-pulumi:scaledowncondition_tag"],
          },
        }
      );

      const loadBalancer = new aws.lb.LoadBalancer(
        config.config["iac-pulumi:loadbalancer_tag"],
        {
          loadBalancerType: config.config["iac-pulumi:loadbalancer_type"],
          subnets: iam_publicSubnets,
          securityGroups: [lbSecurityGroup.id],
          tags: {
            Name: config.config["iac-pulumi:loadbalancer_tag"],
          },
        }
      );

      const listener = new aws.lb.Listener(
        config.config["iac-pulumi:listener_tag"],
        {
          loadBalancerArn: loadBalancer.arn,
          port: config.config["iac-pulumi:listener_port_changed"],
          protocol: config.config["iac-pulumi:listener_protocol"],
          sslPolicy: "ELBSecurityPolicy-2016-08",
          certificateArn: config.config["iam-pulumi:certificateArn"],
          defaultActions: [
            {
              type: config.config["iac-pulumi:listener_type"],
              targetGroupArn: targetGroup.arn,
            },
          ],
          tags: {
            Name: config.config["iac-pulumi:route53record_name"],
          },
        }
      );

      const hostedZone = aws.route53.getZone({
        name: config.config["iac-pulumi:route53record_name"],
      });

      const route53Record = new aws.route53.Record(
        config.config["iac-pulumi:route53record_tag"],
        {
          name: config.config["iac-pulumi:route53record_name"],
          zoneId: hostedZone.then((zone) => zone.zoneId),
          type: config.config["iac-pulumi:route53record_type"],
          aliases: [
            {
              name: loadBalancer.dnsName,
              zoneId: loadBalancer.zoneId,
              evaluateTargetHealth:
                config.config["iac-pulumi:route53record_evaluateTargetHealth"],
            },
          ],
          tags: {
            Name: config.config["iac-pulumi:route53record_name"],
          },
        }
      );
    });
  });
});