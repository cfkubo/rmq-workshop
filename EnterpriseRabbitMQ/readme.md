## RabbitMQ workshop is designed to get hands on operational experience with Enterprise RabbitMQ on K8s. 

![RabbitMQ Screenshot](../static/rabbitmq-new.png)

### Prequisites 
- K8s installed and running (Kind,Docker k8s, MiniKube, Any K8s)
- kubectl 
- helm


## Install instruction for Enterprise RabbitMQ on Kubernetes.


### Install Cert Manager
```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.5.3/cert-manager.yaml
```

### Grab your Broadcom Support Token form broadcom support portal and set it as an environment variable.
```
export token="<YOUR-BROADCOM-SUPPORT-TOKEN-FOR-RMQ-K8S>"
```

### Login to registry.
```
helm registry login rabbitmq-helmoci.packages.broadcom.com -u username -p $token
```

### Create teh rabbitmq-system namespace to install the RMQ Enterprise Operators.
```
kubectl create ns rabbitmq-system
```
### Create a docker-registry secret to be able to pull the images
```
kubectl create secret docker-registry tanzu-rabbitmq-registry-creds --docker-server "rabbitmq.packages.broadcom.com" --docker-username "support-registered-email" --docker-password $token -n rabbitmq-system
```

### Install the RMQ Enterprise Operators.
```
helm install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --version 4.0.1 --namespace rabbitmq-system
```


### Verify Enterprise RMQ Operations installations
```
kubectl get pods  -n rabbitmq-system
```
#### Sample output
```
NAME                                           READY   STATUS    RESTARTS   AGE
messaging-topology-operator-68bdb4ffcd-9fq6n   1/1     Running   0          54m
rabbitmq-cluster-operator-645d7645c-sshhm      1/1     Running   0          54m
```


### Deploying the setup
```
kubectl apply -f upstream-config.yaml

kubectl apply -f downstream-config.yaml
```

### Intall RabbitmqAdmin CLI
Interacting with RabbitMQ Server using rabbitmqadmin v2 CLI . Below steps work on MAC. For other OS please download the executalbe from git releases and move it to /usr/local/bin.
> https://github.com/rabbitmq/rabbitmqadmin-ng/releases

Download the binary for your OS, update permission and move it bin folder

![RabbitMQ Screenshot](../static/rmqadmin.png)
```
wget https://github.com/rabbitmq/rabbitmqadmin-ng/releases/download/v2.1.0/rabbitmqadmin-2.1.0-aarch64-apple-darwin
cp rabbitmqadmin-2.1.0-aarch64-apple-darwin rmqadmin
chmod +x rmqadmin
sudo mv rmqadmin /usr/local/bin
rmqadmin --help

```


### LAB 2: Creating User and Permissions

[https://www.rabbitmq.com/docs/access-control](https://www.rabbitmq.com/docs/access-control)

**NOTE** The RMQ Operators create a default user we will use those creds to login to WebUI.

You can control user permissions. Below are sample commands to create a admin user. 

```

kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl set_user_tags arul administrator


kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl set_user_tags arul administrator

```


### Pull the default username and password created as a k8s Secret for RMQ:

Below perftest are configured to user defalut user created by the operator. Run this in your terminal for the instance you want run the below labs. The below script will export the username and password to your terminal session.

```
instance=upstream-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

instance=downstream-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

```


### LAB 3: Access RMQ Management UI

When running on container platforms like kubernetes, we need to port forward to access the management UI. You can access the blue and green cluster using the below urls.

#### Upstream RMQ Server port-forward to port 15672
```
kubectl port-forward svc/upstream-rabbit 15672:15672
```

#### Downstream RMQ Server port-forward to port 15673
```
kubectl -n default port-forward svc/downstream-rabbit 15673:15672
```
### Access Upstream RMQ
> http://localhost:15672

### Access Downstream RMQ
> http://localhost:15673

**Use the above default username password**



### LAB 4: Standby Replication (Enterprise feature for RMQ)


#### Specify local (upstream cluster) nodes and credentials to be used for WSR.
#### Note that the target port is that of the RabbitMQ Stream protocol, *not* AMQP 1.0.

```
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl set_standby_replication_upstream_endpoints '{"endpoints": ["upstream-rabbit:5552","upstream2-rabbit:5552","upstream3-rabbit:5552"], "username": "test-user", "password": "test-password"}'
```

#### Create a user and grant it permissions to the virtual host that will be used for schema replication.
#### This command is similar to 'rabbitmqctl add_user' but also grants full permissions to the virtual host used for definition sync.

```
kubectl -n default exec downstream-rabbit-server-0 --  rabbitmqctl add_schema_replication_user "test-user" "test-password"
```
#### specify local (upstream cluster) nodes and credentials to be used for schema replication

```
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl set_schema_replication_upstream_endpoints '{"endpoints": ["upstream-rabbit:5672","upstream2-rabbit:5672","upstream3-rabbit:5672"], "username": "test-user", "password": "test-password"}'
```


### LAB 5: Deploy Producers and Consumer Applications - Leveraging RabbitMQ PerfTest

#### RMQPerf Test on k8s:

#### Classic Queue Perf Test

```
instance=upstream-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password


kubectl -n default  --restart=Never run sa-workshop --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 10000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10 --auto-delete false
```

#### Quorum Queue Perf Test

```
instance=upstream-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password


kubectl -n default  --restart=Never run sa-workshop-quorum --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-quorum" --pmessages 1000 --queue "sa-workshop-quorum" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Always run perf-syn-check --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" -i 120 -u "q.sys.synthetic-health-check" -qq -P 5 -ms -b 20 -hst 4 -dcr -c 1 -q 5

```

#### Stream RMQ Perftest
```
instance=upstream-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

kubectl -n default  --restart=Always run stream --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 10000 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
```

### LAB 5: Routing Messages via Exchanges (Need updates - WIP)

- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue event to demo exchange with routing-key event.#
- Publish a message via exchange and see how messages are routed to queues event and event based on routing keys.

<!--
### Updates to rabbitmqadmin v2 formats: (Testing needed)

- Declare an exchange named demo.exchange type=topic durable=true auto_delete=false

rmqadmin --host=localhost --port=15672 --username=arul --password=password declare exchange --vhost="default" --name "demo.exchange" --type "topic" --durable true

rmqadmin declare exchange --host=localhost --port=15672 --username=arul --password=password --vhost "default"  --name "events.all_types.topic" --type "topic" --durable true

rabbitmqadmin --vhost "events" declare queue --name "target.quorum.queue.name" --type "quorum" --durable true

rmqadmin --host=localhost --port=15672  --username=guest --password=guest  show overview

- Declare a queue named event durable=true auto_delete=false

rmqadmin --host=localhost --port=15672 --username=arul --password=password declare queue --vhost="default" --name "event" --durable true --auto-delete false

- Declare a queue named event durable=true auto_delete=false

rmqadmin --host=localhost --port=15672 --username=arul --password=password declare queue --vhost="default" --name "event" --durable true --auto-delete false

- Declare a binding between demo.exchange and event queue with routing key event.#

rmqadmin --host=localhost --port=15672 --username=arul --password=password declare binding --vhost="default" --source "demo.exchange" --destination_type "queue" --destination "event" --routing_key "event.#"

- Declare a binding between demo.exchange and event queue with routing key event.#

rmqadmin --host=localhost --port=15672 --username=arul --password=password declare binding --vhost="default" --source "demo.exchange" --destination_type "queue" --destination "event" --routing_key "event.#"

- Publish a message to demo.exchange with routing key event.test and see the message routed to event queue

rmqadmin --host=localhost --port=15672 --username=arul --password=password publish --vhost="default" --exchange "demo.exchange" --routing_key "event.test" --payload "Hello from demo exchange to event"

- Publish a message to demo.exchange with routing key event.test and see the message routed to event queue

rmqadmin --host=localhost --port=15672 --username=arul --password=password publish --vhost="default" --exchange "demo.exchange" --routing_key "event.test" --payload "Hello from demo exchange to event"

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues events and events based on routing keys.

```
kubectl -n default  --restart=Never run sa-workshop-demo-route --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "event.demo1" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-aq-demo1 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "event.demo2" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
``` -->


### Lab 6: Monitoring RabbitMQ with Prometheus and Grafana

```
helm install prometheus  prometheus-community/prometheus
helm install  grafana grafana/grafana
```
#### Annotate rmq pods to be able to scrape the prometheus metrics

```
kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true

kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true -n default

```
#### Access Grafana

```
kubectl get secret --namespace default grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=grafana" -o jsonpath="{.items[0].metadata.name}")
     kubectl --namespace default port-forward $POD_NAME 3000
```

#### Add prometheus datasource to Grafana
Click on "Add your first data soruce" > select prometheus > http://prometheus-server.default.svc.cluster.local:80 > save and test

![RabbitMQ Screenshot](grafana.png)

#### Add RMQ-Overview Dashboard
Click on create new dasboard > Import > copy the json code from rmq-overview.json file and paste it in json field and use the prometheus datasource

![RabbitMQ Screenshot](../static/grafana.png)

### Lab 7: Disaster Recovery
### Inpsecting Standby Replication on Downstream RMQ

```
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmq-diagnostics inspect_local_data_available_for_standby_replication_recovery
```

```
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmq-diagnostics inspect_local_stream_data_available_for_standby_replication_recovery
```

```
kubectl -n default exec downstream-rabbit-server-0 -- rabbitmqctl list_streams_available_for_standby_replication_recovery 
```
[--vhost <vhost>]



### LAB 9: Upgrading RMQ on K8s

#### Upgrade the RMQ k8s operator to the latest version using Helm

```
helm upgrade tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --namespace rabbitmq-system
```

### Verify Enterprise RMQ Operations Upgrade for Operators
```
kubectl get pods  -n rabbitmq-system
```

#### Edit the upstream-rabbit-new cluster yaml and remove the image line and save it. 

```
kubectl get rabbitmqclusters.rabbitmq.com upstream-rabbit -n default -o yaml | grep -v 'image:' | kubectl apply -f -
```


Repeate the above for downstream cluster to perform upgrade

```
kubectl get rabbitmqclusters.rabbitmq.com downstream-rabbit -n default -o yaml | grep -v 'image:' | kubectl apply -f -
```

### LAB 10: Springboot Producer Application

```
git clone https://github.com/cfkubo/spring-boot-random-data-generator
cd spring-boot-random-data-generator
mvn spring-boot:run

```


### LAB 11: Working RabbitmqAdmin cli

**NOTE** To simply interacting with rabbitmqadmin v2 cli. We can create the below guest user with admin priviliages. Consider using the default creds and specifiy them as options to rabbitmqadmin v2 cli. 

```
kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl add_user guest guest
kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl set_permissions  -p / guest ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-server-0 -- rabbitmqctl set_user_tags guest administrator
```


#### Delcare a queue
```
rmqadmin declare queue --name demo
rmqadmin declare queue --name demoQrorum --type quorum
```
#### List Queues
```
rmqadmin list queues
```
#### Show Memory Breakdown %
```
rmqadmin show memory_breakdown_in_percent  --node rabbit@upstream-rabbit-server-0.upstream-rabbit-nodes.default
```

##### Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods

```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```

### RabbitMQ Tutorials  cover the basics of creating messaging applications using RabbitMQ.

[RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)

### RabbitMQ Labs for Developers and DevOps Engineers

Currenty the below appdev labs leverages docker rmq for the hands on labs.

[RabbitMQ AppDev Labs](https://github.com/ggreen/event-streaming-showcase/tree/main/docs/workshops/Labs/appDev)



### RabbitMQ HTTP API Reference:
[http://localhost:15672/api/index.html](http://localhost:15672/api/index.html)

```
curl -i -u guest:guest http://localhost:15672/api/vhosts
```

```
rmqadmin --host=localhost --port=15672  --username=guest --password=guest  show overview
```

```
rmqadmin --host=localhost --port=15672  --username=arul --password=password  show churn
```

#### Streams: (All you need is a Stream)
[https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu](https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu)


#### References:
- [Streaming with RabbitMQ](https://github.com/ggreen/event-streaming-showcase)
- [RabbitMQ Website](https://www.rabbitmq.com)


🎉 Congratulations, Messaging Maestro! 🎉
You’ve now taken a fantastic journey through deploying and interacting with RabbitMQ on Kubernetes! You’ve installed the operator, deployed single and multi-node clusters, enabled plugins, managed users, and even run performance tests.

Keep exploring, experimenting, and having fun with RabbitMQ and Kubernetes! The world of distributed messaging awaits your command! 🚀🐰📦