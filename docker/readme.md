
### Deploy RabbitMQ on Docker
```
docker network create rmq-network

docker run -d --hostname my-rabbit --name rabbitmq --network rmq-network -p 5672:5672 -p 15672:15672 -p 15692:15692 rabbitmq:4.0-management
```


docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream_management
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_prometheus


docker run -d --name prometheus --network rmq-network -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/config/prometheus.yml prom/prometheus --config.file=/etc/prometheus/config/prometheus.yml

docker run -d --name=grafana -p 3000:3000 --network rmq-network  -e GF_DATASOURCE_DEFAULT_URL=http://prometheus:9090 -e GF_SECURITY_ADMIN_PASSWORD="password" grafana/grafana
```



```
Docker:
docker run --name perf-tst -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 100 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
docker run --name perf-tst7 -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 100 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
K8s:
Pull the Secret for RMQ:
instance=upstream-rabbit
username=$(kubectl -n upstream-rabbitmq   get secret ${instance}-default-user -o jsonpath="{.data.username}" | base64 --decode)
password=$(kubectl -n upstream-rabbitmq   get secret ${instance}-default-user -o jsonpath="{.data.password}" | base64 --decode)
service=${instance}
echo $username
echo $password
Perf Test on k8s:
kubectl -n upstream-rabbitmq  --restart=Never run secret-demo --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "fcu-mesg" --pmessages 1000 --queue "fcu-demo1" --rate 100 --consumer-rate 10 --multi-ack-every 1
kubectl -n upstream-rabbitmq  --restart=Never run arul-perf --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "secret-mesg" --pmessages 1000 --queue "arul-perf" --rate 100 --consumer-rate 10 --multi-ack-every 1
kubectl -n upstream-rabbitmq  --restart=Always run arul-perf2 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" -i 120 -u "q.sys.synthetic-health-check" -qq -P 5 -ms -b 20 -hst 4 -dcr -c 1 -q 5

```
