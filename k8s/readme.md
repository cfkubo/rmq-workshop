## RabbitMQ workshop is designed to get hands on experience with OSS RabbitMQ on K8s. 

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

### LAB 1: Intall OSS RabbitMQ Operator on K8s (any K8s)
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

### Deploy a multinode RMQ Cluster
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
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_stream
kubectl -n default exec my-tanzu-rabbit-server-0 --rabbitmq-plugins enable rabbitmq_stream_management

kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_prometheus

kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_shovel
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_shovel_management
```

### LAB 2: Creating User and Permissions

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

### LAB 3: Access RMQ Management UI

When running on container platforms like kubernetes, we need to port forward to access the management UI. You can access the blue and green cluster using the below urls.

```
kubectl port-forward svc/upstream-rabbit-new 15672:15672
kubectl -n rmq-downstream port-forward svc/downstream-rabbit-new 15673:15672

```
Upstream RMQ
> http://localhost:15672

Downstream RMQ
> http://localhost:15673

Use the above default username password  or the user you have created


### LAB 4: Deploy Producers and Consumer Applications - Leveraging RabbitMQ PerfTest

#### RMQPerf Test on k8s:

#### Quorum

```
kubectl -n default  --restart=Never run sa-workshop --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 1000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-quorum --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-quorum" --pmessages 1000 --queue "sa-workshop-quorum" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Always run arul-perf2 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" -i 120 -u "q.sys.synthetic-health-check" -qq -P 5 -ms -b 20 -hst 4 -dcr -c 1 -q 5

```

#### Stream Perftest
```
kubectl -n default  --restart=Always run stream --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 100 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
```

### LAB 5: Routing Messages via Exchanges 

- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue new-event to demo exchange with routing-key new-event.#
- Publish a message via exchange and see how messages are routed to queues event and new-event based on routing keys.

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues A and B based on routing keys.
```

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare exchange name=demo.exchange type=topic durable=true auto_delete=false

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=event durable=true auto_delete=false

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=new-event durable=true auto_delete=false

kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=event routing_key=event.#

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=new-event routing_key=new-event.#

kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqadmin publish exchange=demo.exchange routing_key=event.test payload="Hello from demo exchange to event"

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=demo.exchange routing_key=new-event.test payload="Hello from demo exchange to new-event"

```

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues A and B based on routing keys.

```
kubectl -n default  --restart=Never run sa-workshop-demo-route --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo --routing-key "demo1" --pmessages 1000 --queue "A" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-aq-demo1 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo --routing-key "demo2" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
```


### Lab 6: Monitoring 

```
helm install prometheus  prometheus-community/prometheus
helm install  grafana grafana/grafana
```
#### Annotate rmq pods to be able to scrape the prometheus metrics
```
kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true 

kubectl annotate pods --all prometheus.io/path=/metrics prometheus.io/port=15692 prometheus.io/scheme=http prometheus.io/scrape=true -n rmq-downstream

```

### LAB 7: Federation  - Actvie - Active RMQ deployments in Docker

Setting up exchange and queue federation on blue cluster 
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@downstream-rabbit-new.rmq-downstream.svc.cluster.local:5672"}' 

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues
```

Setting up exchange and queue federation on green cluster 
```
kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@upstream-rabbit-new.default.svc.cluster.local:5672"}' 

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 --  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues

```

#### Creating queue, exchange, bindinging on both blue & green cluster , publish a message to blue cluster and observe the message on both clusters
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare exchange name=federated.exchange type=fanout durable=true auto_delete=false

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare queue name=federated-event durable=true auto_delete=false


kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#

kubectl -n rmq-downstream exec downstream-rabbit-new-server-0 -- rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#


kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=federated.exchange routing_key=event.test payload="Hello from demo exchange to event"

kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin publish exchange=federated.exchange routing_key=new-event.test payload="Hello from demo exchange to new-event"
```


#### Perf test on federated exchange
```
kubectl -n default  --restart=Never run sa-workshop-fed-exchange --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared  --pmessages 10000 --exchange "federated.exchange" --routing-key "event.test" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10
```

### LAB 8: Upgrading RMQ on K8s

#### Upgrade the RMQ k8s operator
```
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
```

#### Edit the upstream-rabbit-new cluster yaml and remove the image line and save it 
```
 k edit rabbitmqclusters.rabbitmq.com upstream-rabbit-new
```
Repeate the above for downstream cluster to perform upgrade


```
kubectl get secret --namespace default grafana -o jsonpath="{.data.admin-password}" | base64 --decode ; echo

export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=grafana,app.kubernetes.io/instance=grafana" -o jsonpath="{.items[0].metadata.name}")
     kubectl --namespace default port-forward $POD_NAME 3000
```

```
http://prometheus-server.default.svc.cluster.local:80
```

### LAB 9: Springboot Producer Application
```
git clone https://github.com/cfkubo/spring-boot-random-data-generator
cd spring-boot-random-data-generator
mvn spring-boot:run

```

#### References:

- https://github.com/ggreen/event-streaming-showcase
- https://www.rabbitmq.com
