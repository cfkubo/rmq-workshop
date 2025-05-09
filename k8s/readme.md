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

