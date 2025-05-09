## RabbitMQ workshop is designed to get hands on experience with OSS RabbitMQ on K8s. Clone this repo and move to rmq-workshop/K8s folder to continue

```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/k8s
```

### Intall OSS RabbitMQ Operator on K8s (any K8s)
```
kubectl apply -f "https://github.com/rabbitmq/cluster-operator/releases/latest/download/cluster-operator.yml"
```
