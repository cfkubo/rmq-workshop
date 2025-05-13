## RabbitMQ workshop is designed to get hands on experience with OSS RabbitMQ on Docker. Clone this repo and move to rmq-workshop/docker folder to continue

```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/docker
```

### LAB 1: Deploy RabbitMQ on Docker
```
docker network create rmq-network

docker run -d --hostname my-rabbit --name rabbitmq --network rmq-network -p 5672:5672 -p 15672:15672 -p 15692:15692 -p 5552:5552 rabbitmq:4.0-management
```
### Enable plugins on RabbitMQ
```
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_stream_management

docker exec rabbitmq rabbitmq-plugins enable rabbitmq_prometheus

docker exec rabbitmq rabbitmq-plugins enable rabbitmq_shovel
docker exec rabbitmq rabbitmq-plugins enable rabbitmq_shovel_management
```

### Intall RabbitmqAdmin CLI
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
```
docker exec rabbitmq rabbitmqctl add_user arul password
docker exec rabbitmq rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
docker exec rabbitmq rabbitmqctl set_user_tags arul administrator
```

### RabbitMQ Management UI

Access : http://localhost:15672

Username: guest

Password: guest

![RabbitMQ Screenshot](static/rabbitmq.png)

### LAB 3: Deploy Producer & Consumer Application - leveraging RabbitMQ PerfTest

#### Quorum
```
docker run --name perf-tst -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 10000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10
```

#### Stream
```
docker run --name perf-tst7 -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq:5672 --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 100 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10

```

### LAB 4: Monitoring

### Deploy Prometheus on Docker
```
docker run -d --name prometheus --network rmq-network -p 9090:9090 -v $(pwd)/prometheus.yml:/etc/prometheus/config/prometheus.yml prom/prometheus --config.file=/etc/prometheus/config/prometheus.yml
```
### Deploy Grafana on Docker

```
docker run -d --name=grafana -p 3000:3000 --network rmq-network  -e GF_DATASOURCE_DEFAULT_URL=http://prometheus:9090 -e GF_SECURITY_ADMIN_PASSWORD="password" grafana/grafana
```
#### Add prometheus datasource to Grafana
Click on "Add your first data soruce" > select prometheus > http://prometheus:9090 > save and test

![RabbitMQ Screenshot](static/prom-source.png)

#### Add RMQ-Overview Dashboard
Click on create new dasboard > Import > copy the json code from rmq-overview.json file and paste it in json field and use the prometheus datasource

![RabbitMQ Screenshot](static/grafana.png)


### LAB 5: Everyday I'm Shovelling
```
docker exec rabbitmq rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://guest:guest@rabbitmq", "src-queue": "sa-workshop", "dest-protocol": "amqp091", "dest-uri": "amqp://guest:guest@rabbitmq", "dest-queue": "sa-workshop-shovelq", "dest-queue-args": {"x-queue-type": "quorum"}}'
```

### Routing Messages via Exchanges and routing-key (topic, fanout, )
- Create two queues A and B
- Create and exchange named demo
- Bind the queue A to demo exchange with routing-key demo1
- Bind the queue B to demo exchange with routing -key demo2

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues A and B based on routing keys.

```
kubectl -n default  --restart=Never run sa-workshop-demo-route --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo --routing-key "demo1" --pmessages 1000 --queue "A" --rate 100 --consumer-rate 10 --multi-ack-every 10

kubectl -n default  --restart=Never run sa-workshop-aq-demo1 --image=pivotalrabbitmq/perf-test -- --uri "amqp://${username}:${password}@${service}" --producers 10 --consumers 5 --predeclared --exchange demo --routing-key "demo2" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
```


### LAB 6: Springboot Producer Application
```
git clone https://github.com/cfkubo/spring-boot-random-data-generator
cd spring-boot-random-data-generator
mvn spring-boot:run

```

### LAB 7: Working RabbitmqAdmin cli

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
rmqadmin show memory_breakdown_in_percent  --node rabbit@my-rabbit
```



<!--
rmqadmin shovels declare_amqp091 --name my-amqp091-shovel \
    --source-uri amqp://guest:guest@rabbitmq \
    --destination-uri amqp://guest:guest@rabbitmq \
    --ack-mode "on-confirm" \
    --source-queue "sa-workshop" \
    --destination-queue "sa-workshop-shovelq" \
    --predeclared-source false \
    --predeclared-destination false


    curl -v -u guest:guest -X PUT http://localhost:15672/api/parameters/shovel/%2f/my-shovel \
                           -H "content-type: application/json" \
                           -d @- <<EOF
    {
      "value": {
        "src-protocol": "amqp091",
        "src-uri": "amqp://localhost",
        "src-queue": "sa-workshop",
        "dest-protocol": "amqp091",
        "dest-uri": "amqps://rabbit@3a580aa936b9:5672",
        "dest-queue": "sa-workshop-shovelq"
      }
    }
    EOF -->
