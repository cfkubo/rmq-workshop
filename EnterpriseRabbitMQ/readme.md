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

<!-- 
```
helm -n rabbitmq-system install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --set rabbitmqImage.repository="vmware-tanzu-rabbitmq-arm64"
```
helm -n rabbitmq-system install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --set rabbitmqImage.repository="rabbitmq-kubernetes.packages.broadcom.com/tanzu-rabbitmq-package-repo:3.13.3-arm64"
``` -->


### Deploy a single node cluster
```
kubectl apply -f https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/docs/examples/hello-world/rabbitmq.yaml
```

### Deploying the setup 
```
kubectl apply -f rmq-upstream.yaml

kubectl create ns rmq-downstream

kubectl apply -f rmq-downstream.yml
```

### Intall RabbitmqAdmin CLI
Interacting with RabbitMQ Server using rabbitmqadmin v2 CLI
> https://github.com/rabbitmq/rabbitmqadmin-ng/releases

Download the binary for your OS, update permission and move it bin folder

![RabbitMQ Screenshot](static/rmqadmin.png)
```
cp rabbitmqadmin-2.1.0-aarch64-apple-darwin rmqadmin
chmod +x rmqadmin
sudo mv rmqadmin /usr/local/bin
rmqadmin --help

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


rmqadmin declare user --name arul1 --password password1
rmqadmin declare permissions --user arul1 --configure ".*" --read ".*" --write ".*"

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

### LAB 5: Routing Messages via Exchanges 

- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue new-event to demo exchange with routing-key new-event.#
- Publish a message via exchange and see how messages are routed to queues event and new-event based on routing keys.

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues A and B based on routing keys.

- Delcare and exchange named demo.exchange type=topic durable=true auto_delete=false
```
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqadmin declare exchange name=demo.exchange type=topic durable=true auto_delete=false

rmqadmin --vhost "default" declare exchange --name "demo.exchange" --type "topic" --durable true
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

# Declare an exchange named demo.exchange type=topic durable=true auto_delete=false
rmqadmin --host=localhost --port=15672 --username=arul --password=password declare exchange --vhost="default" --name "demo.exchange" --type "topic" --durable true

# Declare a queue named event durable=true auto_delete=false
rmqadmin --host=localhost --port=15672 --username=arul --password=password declare queue --vhost="default" --name "event" --durable true --auto-delete false

# Declare a queue named new-event durable=true auto_delete=false
rmqadmin --host=localhost --port=15672 --username=arul --password=password declare queue --vhost="default" --name "new-event" --durable true --auto-delete false

# Declare a binding between demo.exchange and event queue with routing key event.#
rmqadmin --host=localhost --port=15672 --username=arul --password=password declare binding --vhost="default" --source "demo.exchange" --destination_type "queue" --destination "event" --routing_key "event.#"

# Declare a binding between demo.exchange and new-event queue with routing key new-event.#
rmqadmin --host=localhost --port=15672 --username=arul --password=password declare binding --vhost="default" --source "demo.exchange" --destination_type "queue" --destination "new-event" --routing_key "new-event.#"

# Publish a message to demo.exchange with routing key event.test and see the message routed to event queue
rmqadmin --host=localhost --port=15672 --username=arul --password=password publish --vhost="default" --exchange "demo.exchange" --routing_key "event.test" --payload "Hello from demo exchange to event"

# Publish a message to demo.exchange with routing key new-event.test and see the message routed to new-event queue
rmqadmin --host=localhost --port=15672 --username=arul --password=password publish --vhost="default" --exchange "demo.exchange" --routing_key "new-event.test" --payload "Hello from demo exchange to new-event"

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues events and new-events based on routing keys.

```
kubectl -n default  --restart=Never run sa-workshop-demo-route --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "event.demo1" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-aq-demo1 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "new-event.demo2" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
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


### LAB 7: Federation  - Actvie - Active RMQ deployments in Docker

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

### LAB 9: Springboot Producer Application

```
git clone https://github.com/cfkubo/spring-boot-random-data-generator
cd spring-boot-random-data-generator
mvn spring-boot:run

```


### LAB 7: Working RabbitmqAdmin cli

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

##### Kubectl cmd to clean up pods that are not in Running State. Usefull when trying to rerun perftest pods

```
kubectl -n default delete pod $(kubectl -n default get pod -o jsonpath='{.items[?(@.status.phase!="Running")].metadata.name}')
```

### RabbitMQ Tutorials  cover the basics of creating messaging applications using RabbitMQ.

[RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)

### RabbitMQ Labs for Developers and DevOps Engineers

Currenty the below appdev labs leverages docker rmq for the hands on labs.

[RabbitMQ AppDev Labs](https://github.com/ggreen/event-streaming-showcase/tree/main/docs/workshops/Labs/appDev)

#### References:
- [Streaming with RabbitMQ](https://github.com/ggreen/event-streaming-showcase)
- [RabbitMQ Website](https://www.rabbitmq.com)

#### Streams: (All you need is a Stream)
[https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu](https://www.youtube.com/watch?v=gbf1_aqVKL0&ab_channel=VMwareTanzu)

### RabbitMQ HTTP API Reference: 
[http://localhost:15672/api/index.html](http://localhost:15672/api/index.html)