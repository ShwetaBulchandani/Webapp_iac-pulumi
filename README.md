# iac-pulumi

## INTRODUCTION

Configuration creates set of VPC resources in Dev and Demo environment.

## STEPS TO RUN PULUMI

$ pulumi up 
$ pulumi new
$ pulumi down

## REQUIREMENTS  

pulumi      >= 3.88.0
aws            >= 5.42.0

## PROVIDERS

aws            >= 5.42.0


## MODULES

vpc_cidr_block
vpc_name
vpc_internet_gateway_name
vpc_public_subnet_name
vpc_public_route_name


## RESOURCES 

aws_vpc
aws_internet_gateway
aws_subnet
aws_route_table
aws_route_table_association


## AWS Custom VPC Creation steps:

•	Select the region 
•	Create VPC
•	Enable the DNS HOST name in the VPC
•	Create Internet Gateway
•	Attach Internet gateway to the VPC.
•	Create Public Subnets
•	Enable Auto Assign Public IP settings.
•	Create Public route table
•	Add public route to the public route table
•	Associate the Public subnets with the Public Route table
•	Create the Private subnets
•	Create Private Route table 
•	Add public route to the Private route table
•	Associate the Private Subnets with the Private Route table


---------------
