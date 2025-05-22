
## Prerequisites
### Install the choco installer
[https://chocolatey.org/install](https://chocolatey.org/install)

If you are running the labs of the corporate computer, you will most likely have to change some settings (follow step 2 in the instructions for the choco installer in the link above, to set **Set-ExecutionPolicy AllSigned**). 

Java will be required. 

**All commands are to be run in PowerShell running as Administrator!**


## Lab 1 - Install RabbitMQ on Windows using choco (in PowerShell)
### Follow the steps to install RabbitMQ on windows
[https://www.rabbitmq.com/docs/install-windows](https://www.rabbitmq.com/docs/install-windows)
This will install the dependencies (Erlang OTP) and RabbitMQ. Type **Y** when requested to confirm. 

```
choco install rabbitmq
```

### Place the correct Erlang cookie in the corresponding locations and restart RabbitMQ

```
Copy-Item -Path "$env:USERPROFILE\.erlang.cookie" -Destination "C:\Windows\System32\config\systemprofile" -Force
```

Restart RabbitMQ: 

```
Restart-Service -Name rabbitmq
```

Check the installation by running checking the status of the RabbitMQ service: 

```
Get-Service -Name rabbitmq
```
Expected status is **Running**


### Add the RabbitMQ executables folder to the PATH variable
Check if your RabbitMQ installation folder is this: C:\Program Files\RabbitMQ Server\rabbitmq_server-4.1.0\sbin 

Run this command in PowerShell and restart your PS console: 

```
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPath = "$oldPath;C:\Program Files\RabbitMQ Server\rabbitmq_server-4.1.0\sbin"
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
```


### Enable the necessary plugins 

```
rabbitmq-plugins.bat enable rabbitmq_stream rabbitmq_stream_management rabbitmq_prometheus rabbitmq_shovel rabbitmq_shovel_management rabbitmq_federation rabbitmq_federation_management
```

## Lab 2: Creating user permissions 

https://www.rabbitmq.com/docs/access-control
You can control user permissions. For now we will create a admin user that we use to login to the RabbitMQ management UI.

```
rabbitmqctl add_user arul password
rabbitmqctl set_permissions -p / arul ".*" ".*" ".*"
rabbitmqctl set_user_tags arul administrator
```

## Lab 3: Access RMQ Management UI
You can access the cluster using the below url.

> http://localhost:15672

Use the above default username password  or the user you have created or **guest**/**guest**. 




## Lab 4: Deploy Producers and Consumer Applications - Leveraging RabbitMQ PerfTest

Download the RabbitMQ PerfTest tool and place it into any location on your machine: 

> https://github.com/rabbitmq/rabbitmq-perf-test/releases/download/v2.23.0/perf-test-2.23.0.jar

In a PowerShell console, navigate to that location and run: 

```
java -jar .\perf-test-2.23.0.jar -help
```

#### Basic Perf Test 
*This is a basic test for a classic queue. If you want to perform a test with Streams, you will have to download the streams PerfTest tool.* 

Run this in PowerShell : 

```
$instance = "rabbit"
$username = "arul"
$password = "password"
$service = $instance

java -jar .\perf-test-2.23.0.jar -x 1 -y 10 -s 1000 -C 10 -P 1 --uri "amqp://arul:password@localhost:5672/%2F" --queue "classic-test-queue"
```

## Lab 5: Monitoring RabbitMQ on Windows with Prometheus and Grafana

##### Download Prometheus for Windows and install it. 

> https://prometheus.io/download/

Go to the download directory, unzip it and open the file prometheus.yaml. Edit the field **scrape_configs.static_configs.targets** to: 
```
- targets: ["localhost:9090", "localhost:15692"]
```

Save and close, then run **prometheus.exe** in the same folder. A Prometheus console window (similar to CMD) will open; leave it open in the background. 

#### Download and Run Grafana for Windows 

> https://grafana.com/grafana/download?platform=windows

Check if the Grafana Server is running, by running this Powershell: 

```
Get-Service -Name grafana
```
Expected status is **Running**

Access the Grafana dashboard: 
> localhost:3000

The default username and password is admin/admin. You can skip the request to change password. 

#### Link Grafana and Prometheus together 

In Grafana, go to *Connections* -> search for *Prometheus* -> *Add new source* 

In the field *Prometheus server URL* add the following and *Save* without changing any other details: 
```
http://localhost:9090
```


#### Add the RabbitMQ dashboards 

In Grafana, go to *Dashboards* -> *New* -> *Import* and add the RabbitMQ-Overview dashboard ID (it can be found publicly here https://grafana.com/grafana/dashboards/10991-rabbitmq-overview/):
```
10991
```
Select the *Prometheus* source you added before as default. 

Re-run  Lab 4 and see the magic. 


## Further labs will be added here, work in progress. Bookmark this page for future references


