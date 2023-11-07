# iac-pulumi/README.md


 # iac-pulumi
 * 
## Introduction:
 * This project uses Pulumi to manage AWS infrastructure for your Dev and Demo environments.
 * 
## Prerequisites:
 * - Node.js (version >= 14)
 * - Pulumi CLI (version >= 3.88.0)
 * - AWS CLI (version >= 2)
 * 
## How to Run Pulumi:
 * 1. pulumi up
 * 2. pulumi new
 * 3. pulumi destroy
 * 
## Requirements:
 * Providers:
 * - Pulumi AWS (version >= 5.42.0)
 * 
## Modules:
 * - vpc_cidr_block
 * - vpc_name
 * - vpc_internet_gateway_name
 * - vpc_public_subnet_name
 * - vpc_public_route_name
 * 
## Resources:
 * - aws_vpc
 * - aws_internet_gateway
 * - aws_subnet
 * - aws_route_table
 * - aws_route_table_association
 * 
## AWS Custom VPC Creation Steps:
 * 1. Select the region.
 * 2. Create VPC.
 * 3. Enable DNS hostnames in the VPC.
 * 4. Create an Internet Gateway.
 * 5. Attach the Internet Gateway to the VPC.
 * 6. Create Public Subnets.
 * 7. Enable Auto Assign Public IP settings.
 * 8. Create a Public Route Table.
 * 9. Add a public route to the Public Route Table.
 * 10. Associate the Public Subnets with the Public Route Table.
 * 11. Create Private Subnets.
 * 12. Create a Private Route Table.
 * 13. Add a public route to the Private Route Table.
 * 14. Associate the Private Subnets with the Private Route Table.
 * 
## Application Setup:
 * 
 * DNS & EC2 Instance A Record:
 * - Route53 should be updated by Pulumi.
 * - Add or update A record to the Route53 zone so that your domain points to your EC2 instance.
 * - Your application must be accessible at http://(dev|demo).your-domain-name.tld:<port>/.
 * 
 * Application Logging & Metrics:
 * - Reference Documentation:
 *   - CloudWatch Agent (link-to-docs)
 *   - Unified CloudWatch Agent (link-to-docs)
 *   - CloudWatch Logs (link-to-docs)
 *   - Create IAM Roles and Users for Use With CloudWatch Agent (link-to-docs)
 *   - Install CloudWatch Agent Package on an Amazon EC2 Instance (link-to-docs)
 *   - CloudWatch Metrics (link-to-docs)
 *   - Retrieve Custom Metrics with StatsD (link-to-docs)
 *   - Retrieve Custom Metrics with collected (link-to-docs)
 * 
 * IAM Users, Roles & Policies:
 * - Add IAM roles & policies needed to meet the assignment objectives to Pulumi.
 * 
 * AMI Updates:
 * - Update your Packer template to install the Unified CloudWatch Agent in your AMIs.
 * - Your CloudWatch agent must be set up to start automatically when an EC2 instance is launched using your AMI.
 * 
 * IAM Updates:
 * - Update Pulumi to attach the IAM role attached to the EC2 instance for use with CloudWatch Agent.
 * 
 * Userdata Script Updates:
 * - Your userdata script should configure the CloudWatch agent and restart it.
 */

