## 🚀🐰📦 RabbitMQ workshop is designed to get hands on operational experience with OSS RabbitMQ on K8s. 🚀🐰📦

![RabbitMQ Screenshot](../static/rabbitmq-new.png)

### Prequisites 
- K8s installed and running (Kind,Docker k8s, MiniKube)
- kubectl 
- helm

### Clone this repo and move to rmq-workshop/K8s folder to continue
```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/k8s
```

### 🚀🐰📦 LAB 1: Intall OSS RabbitMQ Operator on K8s (any K8s) 🚀🐰📦
```
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
rabbitmq-cluster-operator-5f94454fb7-bnqtg   1/1     Running   0          97m
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
hello-world-server-0   1/1     Running   0          3m19s
```

```
k get rabbitmqclusters.rabbitmq.com hello-world
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

You can control user permissions. For now we will create a admin user that we use to login to the RabbitMQ management UI.

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator


kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator
```


### Pull the default username and password created as a k8s Secret for RMQ:

Below perftest are configured to user defalut user created by the operator. Run this in your terminal for the instance you want run the below labs. The below script will export the username and password to your terminal session.

```
instance=upstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

instance=downstream-rabbit-new
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password

```

### 🚀🐰📦 LAB 3: Access RMQ Management UI 🚀🐰📦

When running on container platforms like kubernetes, we need to port forward to access the management UI. You can access the blue and green cluster using the below urls.

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

**NOTE** Lets adjust teh memory high watermark to be able run the below perf test without issues
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n default exec upstream-rabbit-new-server-1 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n default exec upstream-rabbit-new-server-2 --  rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_vm_memory_high_watermark absolute "700MiB"
```

#### RMQPerf Test on k8s:

#### Classic Queue Perf Test

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
helm install prometheus  prometheus-community/prometheus
helm install  grafana grafana/grafana
```
#### Annotate rmq pods to be able to scrape the prometheus metrics

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

![RabbitMQ Screenshot](grafana.png)

#### Add RMQ-Overview Dashboard
Click on create new dasboard > Import > copy the json code from rmq-overview.json file and paste it in json field and use the prometheus datasource

![RabbitMQ Screenshot](../static/grafana.png)


### 🚀🐰📦 LAB 6: Everyday I'm Shovelling 🚀🐰📦

Shovel is an amazing plugin you can leverage to move messages from one to another queue. 

Usecases: 
- Moving messages between queues on same or different cluster
- Queues types changed
- Queue names changed
- Queue is full and need to be drained

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672", "src-queue": "sa-workshop", "dest-protocol": "amqp091", "dest-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672", "dest-queue": "sa-workshop-shovelq", "dest-queue-args": {"x-queue-type": "quorum"}}'
```

```
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local", "src-queue": "sa-workshop-shovelq", "dest-protocol": "amqp091", "dest-uri": "amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local", "dest-queue": "sa-workshop-shovelq-green", "dest-queue-args": {"x-queue-type": "quorum"}}'
```

### 🚀🐰📦 LAB 7: Routing Messages via Exchanges 🚀🐰📦

- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue new-event to demo exchange with routing-key new-event.#
- Publish a message via exchange and see how messages are routed to queues event and new-event based on routing keys.

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

#### Setting up exchange and queue federation on blue cluster 
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@downstream-rabbit-new.rmq-downstream.svc.cluster.local:5672"}' 

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues
```

#### Setting up exchange and queue federation on green cluster 
```
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672"}' 

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues

```

#### Creating queue, exchange, bindinging on both blue & green cluster , publish a message to blue cluster and observe the message on both clusters

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

#### Now lets bind all queues to federated exchange on both blue and green RMQ servers.

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

<!-- ```
kubectl get rabbitmqclusters.rabbitmq.com upstream-rabbit-new -n default -o yaml | grep -v 'image:' | kubectl apply -f -
``` -->

Repeate the above for downstream cluster to perform upgrade

```
k edit rabbitmqclusters.rabbitmq.com -n rmq-downstream downstream-rabbit-new
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

## Whats Next ???

### RabbitMQ Tutorials  cover the basics of creating messaging applications using RabbitMQ.

[RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)

### RabbitMQ Labs for Developers and DevOps Engineers

Currenty the below appdev labs leverages docker rmq for the hands on labs.

[RabbitMQ AppDev Labs](https://github.com/ggreen/event-streaming-showcase/tree/main/docs/workshops/Labs/appDev)




##### Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods

```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```

### RabbitMQ HTTP API Reference: 
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

#### 🚀🐰📦 Streams: (All you need is a Stream) 🚀🐰📦
[https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu](https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu)



🎉 Congratulations, Messaging Maestro! 🎉
You’ve now taken a fantastic journey through deploying and interacting with RabbitMQ on Kubernetes! You’ve installed the operator, deployed single and multi-node clusters, enabled plugins, managed users, and even run performance tests.

Keep exploring, experimenting, and having fun with RabbitMQ and Kubernetes! The world of distributed messaging awaits your command! 🚀🐰📦


##  🎶🥁🚀🐰📦 One Server to Queue them All !!!!!!! 🚀🐰📦🥁🎶 

An AI generated song dedicated to RabbitMQ and Kubernetes. Enjoy the music! 🎶🥁🚀🐰📦

[https://suno.com/s/yfhHe8JGZUdx2EDn](https://suno.com/s/yfhHe8JGZUdx2EDn)


#### Troubleshooting
- Verfity typo in token or username when logging to helm repo to pull enterprise images
- Check the pods logs
- Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods
```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```


#### 🚀🐰📦 References:🚀🐰📦
- [Streaming with RabbitMQ](https://github.com/ggreen/event-streaming-showcase)
- [RabbitMQ Website](https://www.rabbitmq.com)
- [Broadcom/VMware RabbitMQ for K8s Docs](https://techdocs.broadcom.com/us/en/vmware-tanzu/data-solutions/tanzu-rabbitmq-on-kubernetes/4-0/tanzu-rabbitmq-kubernetes/installation-using-helm.html)
