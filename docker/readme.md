
### Deploy RabbitMQ on Docker
```
docker network create rmq-network

docker run -d --hostname my-rabbit --name rabbitmq --network rmq-network -p 5672:5672 -p 15672:15672 -p 15692:15692 rabbitmq:4.0-management
```
### Enable plugins on RabbitMQ
```
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream_management
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_prometheus
```

### Intall RabbitmqAdmin CLI
> https://github.com/rabbitmq/rabbitmqadmin-ng/releases

Download the binary for your OS, update permission and move it bin folder

```
cp rabbitmqadmin-2.1.0-aarch64-apple-darwin rmqadmin
chmod +x rmqadmin
sudo mv rmqadmin /usr/local/bin
rmqadmin --help 

```

### Deploy Prometheus on Docker
```
docker run -d --name prometheus --network rmq-network -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/config/prometheus.yml prom/prometheus --config.file=/etc/prometheus/config/prometheus.yml
```
### Deploy Grafana on Docker

```
docker run -d --name=grafana -p 3000:3000 --network rmq-network  -e GF_DATASOURCE_DEFAULT_URL=http://prometheus:9090 -e GF_SECURITY_ADMIN_PASSWORD="password" grafana/grafana
```

### Deploy Producer & Consumer Application - leveraging RabbitMQ PerfTest

#### Quorum
```
docker run --name perf-tst -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 100 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10
```

#### Stream
```
docker run --name perf-tst7 -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 100 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10

```
