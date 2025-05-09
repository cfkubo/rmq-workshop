## RabbitMQ workshop is designed to get hands on experience with OSS RabbitMQ on K8s. Clone this repo and move to rmq-workshop/K8s folder to continue

```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/k8s
```

### Intall OSS RabbitMQ Operator on K8s (any K8s)
```
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
```
```
kubectl get namespaces
```
NAME              STATUS   AGE
default           Active   73s
kube-node-lease   Active   73s
kube-public       Active   73s
kube-system       Active   73s
rabbitmq-system   Active   2s


### Deploy a single node RMQ Cluster

```
kubectl apply -f https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/docs/examples/hello-world/rabbitmq.yaml
```
```
kubectl get po
```
NAME                   READY   STATUS    RESTARTS   AGE
hello-world-server-0   1/1     Running   0          3m19s

```
k get rabbitmqclusters.rabbitmq.com hello-world
```
NAME          ALLREPLICASREADY   RECONCILESUCCESS   AGE
hello-world   True               True               5m26s


### Deploy a multinode RMQ Cluster
```
kubectl apply -f rmq.yaml
```

```
kubectl  get pods


NAME                       READY   STATUS    RESTARTS   AGE
hello-world-server-0       1/1     Running   0          10m
my-tanzu-rabbit-server-0   1/1     Running   0          2m59s
my-tanzu-rabbit-server-1   1/1     Running   0          2m59s
my-tanzu-rabbit-server-2   1/1     Running   0          2m59s
```

### Enable Plugins on RMQ Server

```
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_stream
kubectl -n default exec my-tanzu-rabbit-server-0 --rabbitmq-plugins enable rabbitmq_stream_management

kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_prometheus

kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_shovel
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmq-plugins enable rabbitmq_shovel_management
```

### Creating User and Permissions
```
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec my-tanzu-rabbit-server-0 -- rabbitmqctl set_user_tags arul administrator
```



### Pull the default username and password created as a k8s Secret for RMQ:
```
instance=my-tanzu-rabbit
username=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n default   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password
```

### Access RMQ Management UI
```
k port-forward svc/my-tanzu-rabbit 15672:15672
```

> http://localhost:15672

Use the above default username password  or the user you have created


### Deploy Producers and Consumer Applications - Leveraging RabbitMQ PerfTest

#### RMQPerf Test on k8s:

#### Quorum

```
kubectl -n default  --restart=Never run sa-workshop --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 1000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-quorum --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-quorum" --pmessages 1000 --queue "sa-workshop-quorum" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Always run arul-perf2 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" -i 120 -u "q.sys.synthetic-health-check" -qq -P 5 -ms -b 20 -hst 4 -dcr -c 1 -q 5

```

#### Stream
```
kubectl -n default  --restart=Always run stream --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 100 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
```