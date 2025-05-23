## 🚀🐰📦 RabbitMQ workshop is designed to get hands on operational experience with OSS RabbitMQ on K8s. 🚀🐰📦

![RabbitMQ Screenshot](../static/rabbitmq-new.png)

### Prequisites
- K8s installed and running (Kind,Docker k8s, MiniKube)
- kubectl
- helm

### Labs

* [LAB 1: Deploy RabbitMQ operator and Rabbitmq Servers](#-lab-1-intall-oss-rabbitmq-operator-on-k8s-any-k8s-)
* [LAB 2: Creating User and Permissions](#-lab-2-creating-user-and-permissions-)
* [LAB 3: Accessing RabbitMQ Management UI](#lab-3-access-rmq-management-ui-)
* [LAB 4: Publishing and Consuming Messages](#lab-4-publishing-and-consuming-messages-)
* [LAB 5: Monitoring RabbitMQ with Prometheus](#-lab-5-monitoring-rabbitmq-on-kubernetes-)
* [LAB 6: Using Shovel Plugin to Move Messages](#-lab-6-everyday-im-shovelling-)
* [LAB 7: Routing Messages using Exchanges](#-lab-7-routing-messages-via-exchanges-)
* [LAB 8: Federation Plugin: RabbitMQ Active - Active Configuration](#-lab-8-federation----actvie---active-rmq-deployments-in-kubernetes-)
* [LAB 9: Upgrading RabbitMQ Operators and RabbitMQ Servers](#-lab-9-upgrading-rmq-on-k8s-)
* [LAB 10: Using RabbitMQAdmin V2 CLI](#-lab-10-working-rabbitmqadmin-cli-)
* [LAB 11: RabbitMQ HTTP API Refrence](#-lab-11-rabbitmq-http-api-reference-)


### Clone this repo and move to rmq-workshop/K8s folder to continue
```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/k8s
```

### 🚀🐰📦 LAB 1: Intall OSS RabbitMQ Operator on K8s (any K8s) 🚀🐰📦
Below kubectl command will create all the neccessary objects on the cluster to deploy RabbitMQ using operator. 

```bash
kubectl apply -f https://github.com/rabbitmq/cluster-operator/releases/download/v2.10.0/cluster-operator.yml

```

Validate Operator Installation:

```
kubectl get namespaces
```

Sample Output: rabbitmq-system namespace is created and should be running the RMQ operator pod
```
NAME              STATUS   AGE
default           Active   73s
kube-node-lease   Active   73s
kube-public       Active   73s
kube-system       Active   73s
rabbitmq-system   Active   2s
```

```
Kubectl get po -n rabbitmq-system
```
Sample Output:

```
NAME                                         READY   STATUS    RESTARTS   AGE
rabbitmq-cluster-operator-5f94454fb7-bnqtg   1/1     Running   0          4s
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

### Deploy a single node RMQ Cluster

```
kubectl apply -f https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/docs/examples/hello-world/rabbitmq.yaml
```
```
kubectl get po
```
Sample Output:
```
NAME                   READY   STATUS    RESTARTS   AGE
hello-world-server-0   1/1     Running   0          1m
```

```
kubectl get rabbitmqclusters.rabbitmq.com hello-world
```
Sample Output:
```
NAME          ALLREPLICASREADY   RECONCILESUCCESS   AGE
hello-world   True               True               5m26s
```

### Deploy a multinode RMQ Cluster : HA Setup
```
kubectl create ns rmq-downstream
kubectl apply -f rmq-upstream.yaml
kubectl apply -f rmq-downstream.yml -n rmq-downstream
```

```
kubectl  get pods
```
Sample Output:
```
NAME                       READY   STATUS    RESTARTS   AGE
hello-world-server-0       1/1     Running   0          10m
my-tanzu-rabbit-server-0   1/1     Running   0          2m59s
my-tanzu-rabbit-server-1   1/1     Running   0          2m59s
my-tanzu-rabbit-server-2   1/1     Running   0          2m59s
```

### Enable Plugins on RMQ Server

**NOTE** : We have enabled the plugin using rmq yaml. This is not required if you have enabled the plugin using rmq yaml.

```
kubectl -n default exec upstream-rabbit-new-server-0  -- rabbitmq-plugins enable rabbitmq_stream
kubectl -n default exec upstream-rabbit-new-server-0  -- rabbitmq-plugins enable rabbitmq_stream_management

kubectl -n default exec upstream-rabbit-new-server-0  -- rabbitmq-plugins enable rabbitmq_prometheus

kubectl -n default exec upstream-rabbit-new-server-0  -- rabbitmq-plugins enable rabbitmq_shovel
kubectl -n default exec upstream-rabbit-new-server-0  -- rabbitmq-plugins enable rabbitmq_shovel_management
```

### 🚀🐰📦 LAB 2: Creating User and Permissions 🚀🐰📦

[https://www.rabbitmq.com/docs/access-control](https://www.rabbitmq.com/docs/access-control)

You can control user permissions. For now we will create a admin user that we use to login to the RabbitMQ management UI. Below some of test are preconfigured with the below user. To be able run all the labs you need to have this user created.

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator


kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator
```


### Pull the default username and password created as a k8s Secret for RMQ:

Below perftest are configured to user defalut user created by the operator. Run this in your terminal for the instance you want run the below labs. The below script will export the username and password to your terminal session. Below command are for example. All the below labs provide these command when running the perf test jobs.

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

instance=downstream-rabbit-new
username=$(kubectl -n rmq-downstream   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n rmq-downstream   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

```

### 🚀🐰📦 LAB 3: Access RMQ Management UI 🚀🐰📦

When running on container platforms like kubernetes and RabbitMQ server deployed with ClusterIP configurations, we need to port forward to access the management UI. You can access the Upstream and Downstream cluster using the below urls.

- Access the upstream RMQ server via
```
kubectl port-forward svc/upstream-rabbit-new 15672:15672
```
- Access the upstream RMQ server via
```
kubectl -n rmq-downstream port-forward svc/downstream-rabbit-new 15673:15672
```
Upstream RMQ
> http://localhost:15672

Downstream RMQ
> http://localhost:15673

Use the above default username password  or the user you have created


### 🚀🐰📦 LAB 4: Deploy Producers and Consumer Applications - Leveraging RabbitMQ PerfTest 🚀🐰📦

**NOTE** Lets adjust the memory high watermark to be able run the below perf test without issues

**Understand Memory High Watermark**

RabbitMQ has a concept of memory high watermark which is used to determine when to start dropping messages. The default value is 0.4 (40%). This means that RabbitMQ will start dropping messages when it reaches 40% of its total available memory.

Below command will adjust the configuration at runtime but we can do the same with rabbitmq configuration to be persistent.


```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n default exec upstream-rabbit-new-server-1 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n default exec upstream-rabbit-new-server-2 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"
```

#### RMQPerf Test on k8s:

[https://perftest.rabbitmq.com/](https://perftest.rabbitmq.com/)

"RabbitMQ has a throughput testing tool, PerfTest, that is based on the Java client and can be configured to simulate basic workloads and more advanced workloads as well. PerfTest has extra tools that produce HTML graphs of the output.

A RabbitMQ cluster can be limited by a number of factors, from infrastructure-level constraints (e.g. network bandwidth) to RabbitMQ configuration and topology to applications that publish and consume. PerfTest can demonstrate baseline performance of a node or a cluster of nodes.

PerfTest uses the AMQP 0.9.1 protocol to communicate with a RabbitMQ cluster. Use Stream PerfTest if you want to test RabbitMQ Streams with the stream protocol."

#### Classic Queue Perf Test

This kubectl run command launches a temporary Kubernetes Pod named sa-workshop to execute a RabbitMQ performance test. It uses the pivotalrabbitmq/perf-test image and connects to the RabbitMQ instance specified by the $service URI with provided credentials.

The test simulates 10 message producers sending a total of 100,000 messages (10,000 each) with the routing key "sa-workshop" to a pre-declared queue also named "sa-workshop" at a rate of 100 messages/second per producer. Simultaneously, 5 consumers retrieve messages from the same queue at a rate of 10 messages/second each, sending multiple acknowledgements every 10 messages. The queue is configured not to auto-delete. This setup measures RabbitMQ's performance under a defined publishing and consuming load.

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

kubectl -n default  --restart=Never run sa-workshop --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 10000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10 --auto-delete false
```

#### Quorum Queue Perf Test

This kubectl run command launches a single-use Pod named sa-workshop-quorum in the default namespace, using the pivotalrabbitmq/perf-test image. It targets a RabbitMQ instance at the specified $service URI. This test specifically uses a quorum queue (--quorum-queue). It simulates 10 producers sending 1,000 messages each (total 10,000) with the routing key "sa-workshop-quorum" to a pre-declared queue named "sa-workshop-quorum" at 100 messages/second per producer. Concurrently, 5 consumers retrieve messages from this queue at 10 messages/second each, acknowledging every 10 messages.

Second Command:

This kubectl run command deploys a Pod named perf-syn-check in the default namespace that will always be restarted (--restart=Always). It uses the pivotalrabbitmq/perf-test image to perform a synthetic health check on the RabbitMQ instance at $service. It runs for 120 iterations (-i 120), publishes to the "q.sys.synthetic-health-check" queue (-u ... -qq), with 5 persistent messages (-P 5), using message sizes (-ms), a batch size of 20 (-b 20), 4 hostnames (-hst 4), disables credit flow control (-dcr), with 1 consumer (-c 1) and a queue depth target of 5 (-q 5).

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password


kubectl -n default  --restart=Never run sa-workshop-quorum --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-quorum" --pmessages 1000 --queue "sa-workshop-quorum" --rate 100 --consumer-rate 10 --multi-ack-every 10


kubectl -n default  --restart=Always run perf-syn-check --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" -i 120 -u "q.sys.synthetic-health-check" -qq -P 5 -ms -b 20 -hst 4 -dcr -c 1 -q 5

```

#### Stream RMQ Perftest

This kubectl run command deploys a persistently running Pod named stream in the default namespace (--restart=Always). It utilizes the pivotalrabbitmq/perf-test image to benchmark a RabbitMQ stream queue (--stream-queue) at the specified $service URI.

The test involves 10 producers sending a total of 100,000 messages (10,000 each) with the routing key "sa-workshop-stream" to a pre-declared stream queue named "sa-workshop-stream", at a rate of 100 messages/second per producer. Concurrently, 5 consumers retrieve messages from this stream queue at a rate of 10 messages/second each, acknowledging every message (--multi-ack-every 1). Additionally, it specifies 10 concurrent connections per consumer (-c 10). This setup measures the performance of RabbitMQ streams under a defined load.

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

kubectl -n default  --restart=Always run stream --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 10000 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
```



### 🚀🐰📦 Lab 5: Monitoring RabbitMQ on Kubernetes 🚀🐰📦

```
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
```

```
helm install prometheus  prometheus-community/prometheus
helm install  grafana grafana/grafana
```
#### Annotate rmq pods to be able to scrape the prometheus metrics

**NOTE** Patched annotation will be removed when a pod restarts. To make it permanent, you need to add the annotation to the deployment or statefulset of RabbitMQ.

```
kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true

kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true -n rmq-downstream

```
#### Access Grafana

```
kubectl get secret --namespace default grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=grafana" -o jsonpath="{.items[0].metadata.name}")
     kubectl --namespace default port-forward $POD_NAME 3000
```

#### Add prometheus datasource to Grafana
Click on "Add your first data soruce" > select prometheus > http://prometheus-server.default.svc.cluster.local:80 > save and test

```
http://prometheus-server.default.svc.cluster.local:80
```

![RabbitMQ Screenshot](grafana.png)

#### Add RMQ-Overview Dashboard
Click on create new dasboard > Import > copy the json code from **rmq-overview.json** file and paste it in json field and use the prometheus datasource

![RabbitMQ Screenshot](../static/grafana.png)


### 🚀🐰📦 LAB 6: Everyday I'm Shovelling 🚀🐰📦

Shovel is an amazing plugin you can leverage to move messages from one to another queue.

Usecases:
- Moving messages between queues on same or different cluster
- Queues types changed
- Queue names changed
- Queue is full and need to be drained

> This kubectl exec command directly executes the rabbitmqctl utility within the running Pod named upstream-rabbit-new-server-0 in the default namespace.

> The rabbitmqctl set_parameter shovel my-shovel part instructs RabbitMQ to create or update a shovel named my-shovel. A shovel is a RabbitMQ feature that moves messages between queues, potentially across different brokers.

> The JSON payload defines the shovel's behavior:

> "src-protocol": "amqp091" and "src-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672": Specifies the source connection details using the AMQP 0.9.1 protocol to the RabbitMQ service upstream-rabbit-new on the default Kubernetes service port (5672), with the username "arul" and password "password".
> "src-queue": "sa-workshop": Indicates that the shovel will consume messages from the queue named sa-workshop on the source broker.
> "dest-protocol": "amqp091" and "dest-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672": Specifies the destination connection details, which in this case is the same RabbitMQ service as the source.
> "dest-queue": "sa-workshop-shovelq": Indicates that the shovel will publish the consumed messages to the queue named sa-workshop-shovelq on the destination broker.
> "dest-queue-args": {"x-queue-type": "quorum"}: Configures the destination queue sa-workshop-shovelq to be a quorum queue.

> In essence, this command configures a shovel within the upstream-rabbit-new-server-0 Pod to take messages from the sa-workshop queue on the upstream-rabbit-new service and move them to a newly created (or existing) quorum queue named sa-workshop-shovelq on the same service. The rabbitmq_shovel plugin must be enabled on the RabbitMQ server for this command to function.



- In this sample we are moving messages from a classic queue to quorum queue
```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672", "src-queue": "sa-workshop", "dest-protocol": "amqp091", "dest-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672", "dest-queue": "sa-workshop-shovelq", "dest-queue-args": {"x-queue-type": "quorum"}}'
```
**Checkout the changes in Managment UI** 

- In this sample we are moving messages from a quorum queue to stream queue in same cluster (same could be achieved with different clusters as well)
```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_parameter shovel my-shovel2 '{"src-protocol": "amqp091", "src-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local", "src-queue": "sa-workshop-shovelq", "dest-protocol": "amqp091", "dest-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local", "dest-queue": "sa-workshop-shovelq-Upstream", "dest-queue-args": {"x-queue-type": "stream"}}'
```

### 🚀🐰📦 LAB 7: Routing Messages via Exchanges 🚀🐰📦

- Fanout for Broad Notifications: Use a fanout exchange (like your demo example without specific routing keys) to broadcast the same message to multiple independent consumer queues (e.g., logging, analytics).

- Topic-Based Event Handling: Employ a topic exchange (like your demo with # wildcards) to route different types of events to specific consumer queues based on the routing key (e.g., event.created goes to "event" queue, new-event.processed to "new-event").

- Direct Routing for Specific Tasks: Utilize a direct exchange to send messages with a precise routing key to a single bound queue, ideal for task queues where specific workers handle particular jobs.


- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue new-event to demo exchange with routing-key new-event.#
- Publish a message via exchange and see how messages are routed to queues event and new-event based on routing keys.

![RabbitMQ Screenshot](../static/exchange2.png)


#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues A and B based on routing keys.

- Delcare and exchange named demo.exchange type=topic durable=true auto_delete=false
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare exchange name=demo.exchange type=topic durable=true auto_delete=false
```
- Delcare a queue named event durable=true auto_delete=false
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=event durable=true auto_delete=false
```
- Delcare a queue named new-event durable=true auto_delete=false
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=new-event durable=true auto_delete=false
```
- Declare a binding between demo.exchange and event queue with routing key event.#
```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=event routing_key=event.#
```

- Delcare a binding between demo.exchange and new-event queue with routing key new-event.#
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=new-event routing_key=new-event.#
```
- Publish a message to demo.exchange with routing key event.test and see the message routed to event queue

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqadmin publish exchange=demo.exchange routing_key=event.test payload="Hello from demo exchange to event"
```

- Publish a message to demo.exchange with routing key new-event.test and see the message routed to new-event queue

```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=demo.exchange routing_key=new-event.test payload="Hello from demo exchange to new-event"
```

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues events and new-events based on routing keys.

```
kubectl -n default  --restart=Never run sa-workshop-demo-route --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "event.demo1" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-aq-demo1 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "new-event.demo2" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
```


### 🚀🐰📦 LAB 8: Federation  - Actvie - Active RMQ deployments in Kubernetes 🚀🐰📦

[https://www.rabbitmq.com/docs/federation](https://www.rabbitmq.com/docs/federation)

#### Setting up exchange and queue federation on upstream cluster
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@downstream-rabbit-new.rmq-downstream.svc.cluster.local:5672"}'

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues
```

#### Setting up exchange and queue federation on downstream cluster
```
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672"}'

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues

```

#### Creating queue, exchange, bindinging on both Upstream & Downstream cluster , publish a message to Upstream cluster and observe the message on both clusters

![RabbitMQ Screenshot](../static/exchange.png)

- Delcare an exchange named federated.exchange on upstream RMQ

```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare exchange name=federated.exchange type=fanout durable=true auto_delete=false
```

- Delcare a queue named federated-event on upstream RMQ


```

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=federated-event durable=true auto_delete=false

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=federated-event-new durable=true auto_delete=false

```

- Declare a binding between the federated.exchange and federated-event queue on Upstream RMQ

```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event-new routing_key=event.#
```

- Declare a binding between the federated.exchange and federated-event queue on Downstream RMQ

```
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event-new routing_key=event.#
```

- Publish a message to federated exachange with routing key event.test and see the message routed to both RMQ Servers

```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=federated.exchange routing_key=event.test payload="Hello from demo exchange to with key event"

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=federated.exchange routing_key=new-event.test payload="Hello from demo exchange to with key new-event"
```

#### Now lets bind all queues to federated exchange on both Upstream and Downstream RMQ servers.

```
kubectl -n default exec upstream-rabbit-new-server-0 -it  --  rabbitmqadmin list queues > queues.txt

for i in `cat queues.txt | awk '{print $2}' | grep -v name` ; do kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=$i routing_key=event.# ; done

for i in `cat queues.txt | awk '{print $2}' | grep -v name` ; do kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=$i routing_key=event.# ; done

```

#### Perf test on federated exchange

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password


kubectl -n default  --restart=Never run sa-workshop-fed-exchange --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared  --pmessages 1000 --exchange "federated.exchange" --routing-key "event.test" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10
```

### 🚀🐰📦 LAB 9: Upgrading RMQ on K8s 🚀🐰📦

#### Upgrade the RMQ k8s operator

```
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/download/v2.13.0/cluster-operator.yml"
```

#### Edit the upstream-rabbit-new cluster yaml and remove the image line and save it

```
k edit rabbitmqclusters.rabbitmq.com -n default upstream-rabbit-new
```
OR

```
kubectl patch rabbitmqclusters.rabbitmq.com upstream-rabbit-new -n default --type merge -p '{"spec": {"image": "rabbitmq:4.1.0-management"}}'
```
<!-- rabbitmq:3.13.7-management


rabbitmq:4.1.0-management -->

<!-- ```
kubectl get rabbitmqclusters.rabbitmq.com upstream-rabbit-new -n default -o yaml | grep -v 'image:' | kubectl apply -f -
``` -->

Repeate the above for downstream cluster to perform upgrade

```
k edit rabbitmqclusters.rabbitmq.com -n rmq-downstream downstream-rabbit-new
```

OR 

```
kubectl patch rabbitmqclusters.rabbitmq.com downstream-rabbit-new -n rmq-downstream --type merge -p '{"spec": {"image": "rabbitmq:4.1.0-management"}}'
```

<!-- ```
kubectl get rabbitmqclusters.rabbitmq.com downstream-rabbit-new -n rmq-downstream -o yaml | grep -v 'image:' | kubectl apply -f -
``` -->


<!-- ### LAB 10: Springboot Producer Application

```
git clone https://github.com/cfkubo/spring-boot-random-data-generator
cd spring-boot-random-data-generator
mvn spring-boot:run

``` -->

### 🚀🐰📦 LAB 10: Working RabbitmqAdmin cli 🚀🐰📦

**NOTE** To simply interacting with rabbitmqadmin v2 cli. We can create the below guest user with admin priviliages. Consider using the default creds and specifiy them as options to rabbitmqadmin v2 cli.

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl add_user guest guest
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / guest ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags guest administrator
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
rmqadmin show memory_breakdown_in_percent  --node rabbit@upstream-rabbit-new-server-0.upstream-rabbit-new-nodes.default
```


### 🚀🐰📦 LAB 11: RabbitMQ HTTP API Reference: 🚀🐰📦
[http://localhost:15672/api/index.html](http://localhost:15672/api/index.html)

```
curl -i -u arul:password http://localhost:15672/api/vhosts
```

```
rmqadmin --host=localhost --port=15672  --username=guest --password=guest  show overview
```

```
rmqadmin --host=localhost --port=15672  --username=arul --password=password  show churn
```


## Whats Next ???

### RabbitMQ Tutorials  cover the basics of creating messaging applications using RabbitMQ.

[RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)


### RabbitMQ Labs for Developers and DevOps Engineers

Currenty the below appdev labs leverages docker rmq for the hands on labs.

[RabbitMQ AppDev Labs](https://github.com/gDownstream/event-streaming-showcase/tree/main/docs/workshops/Labs/appDev)




##### Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods

```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```


# 🚀🐰📦 Everything about Streams: (All you need is a Stream) 🚀🐰📦

[RabbitMQ Streams - extreme performance with unrivalled flexibility](https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu)

Use Cases for Using Streams

- Large fan-outs

- Replay (Time-travelling)

- Throughput Performance

- Large backlogs

### RabbitMQ Blogs:
- https://www.rabbitmq.com/blog/2025/01/17/how-are-the-messages-stored
- https://www.rabbitmq.com/blog/2023/10/16/stream-filtering
- https://www.rabbitmq.com/blog/2022/02/21/gatekeeper-validation
- https://www.rabbitmq.com/blog/2021/07/28/rabbitmq-streams-message-deduplication


### 🎉 Congratulations, Messaging Maestro! 🎉

You’ve now taken a fantastic journey through deploying and interacting with RabbitMQ on Kubernetes! You’ve installed the operator, deployed single and multi-node clusters, enabled plugins, managed users, and even run performance tests.

Keep exploring, experimenting, and having fun with RabbitMQ and Kubernetes! The world of distributed messaging awaits your command! 🚀🐰📦


##  🎶🥁🚀🐰📦 One Server to Queue them All !!!!!!! 🚀🐰📦🥁🎶

An AI generated song dedicated to RabbitMQ and Kubernetes. Enjoy the music! 🎶🥁🚀🐰📦

[One Server to Queue them All](https://suno.com/s/qJBkNInAtdU3gujo)


#### Troubleshooting

- Check the pods logs

- Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods
```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```


#### 🚀🐰📦 References:🚀🐰📦
- [Streaming with RabbitMQ](https://github.com/gDownstream/event-streaming-showcase)
- [RabbitMQ Website](https://www.rabbitmq.com)
- [Broadcom/VMware RabbitMQ for K8s Docs](https://techdocs.broadcom.com/us/en/vmware-tanzu/data-solutions/tanzu-rabbitmq-on-kubernetes/4-0/tanzu-rabbitmq-kubernetes/installation-using-helm.html)
