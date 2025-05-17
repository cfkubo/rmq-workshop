## RabbitMQ workshop is designed to get hands on operational experience with OSS RabbitMQ on Docker.

![RabbitMQ Screenshot](../static/rabbitmq-new.png)

### Prequisites 
- Docker installed and running
- maven
- rabbitmqadmin v2 cli

### Clone this repo and move to rmq-workshop/docker folder to continue
```
git clone https://github.com/cfkubo/rmq-workshop
cd rmq-workshop/docker
```

### LAB 1: Deploy RabbitMQ on Docker
We will create a docker network named rmq-network and deploy RabbitMQ on it.
```
docker network create rmq-network

docker run -d --hostname my-rabbit-blue --name rabbitmq-blue --network rmq-network  -p 15672:15672 -p 15692:15692 -p 5552:5552 rabbitmq:4.0-management

docker run -d --hostname my-rabbit-green --name rabbitmq-green --network rmq-network  -p 15673:15672 -p 15691:15692 -p 5553:5552 rabbitmq:4.0-management

```

### Enable plugins on RabbitMQ

Enable stream, prometheus, shovel and federation plugins on blue server. We will using each of pulgins in labs below.
```
docker exec rabbitmq-blue rabbitmq-plugins enable rabbitmq_stream
docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_stream_management

docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_prometheus

docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_shovel
docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_shovel_management

docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_federation
docker exec rabbitmq-blue  rabbitmq-plugins enable rabbitmq_federation_management
```

Enable stream, prometheus, shovel and federation plugins on green server
```
docker exec rabbitmq-green rabbitmq-plugins enable rabbitmq_stream
docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_stream_management

docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_prometheus

docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_shovel
docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_shovel_management

docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_federation

docker exec rabbitmq-green  rabbitmq-plugins enable rabbitmq_federation_management
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
docker exec rabbitmq-blue rabbitmqctl add_user arul password
docker exec rabbitmq-blue rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
docker exec rabbitmq-blue rabbitmqctl set_user_tags arul administrator

docker exec rabbitmq-green rabbitmqctl add_user arul password
docker exec rabbitmq-green rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
docker exec rabbitmq-green rabbitmqctl set_user_tags arul administrator
```

### RabbitMQ Management UI


When running on docker container , we need to port forward to access the management UI. You can access the blue and green cluster using the below urls.

Access rabbitmq-blue : [http://localhost:15672](http://localhost:15672)

**Username:** guest

**Password:** guest

Access rabbitmq-green : [http://localhost:15673](http://localhost:15673)

**Username:**  guest

**Password:** guest

![RabbitMQ Screenshot](static/rabbitmq.png)

### LAB 3: Deploy Producer & Consumer Application - leveraging RabbitMQ PerfTest

RabbitMQ PerfTest is an amazing tool sumuliate producers and consumer application and also can be used to benchmark your RabbitMQ cluster. 

#### Quorum
The below two command create two quorum queues and publishes 10000 messages to each queue.
```
docker run --name perf-tst-quorum -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq-blue:5672 --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-q1" --pmessages 10000 --queue "sa-workshop-q1" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10


docker run --name perf-tst-workshop -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq-blue:5672 --quorum-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop" --pmessages 10000 --queue "sa-workshop" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10
```

#### Stream
The below RabbitMQ perftest command will create a stream queue and perform the same operations as above.

```
docker run --name perf-tst-stream -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq-blue:5672 --stream-queue --producers 10 --consumers 5 --predeclared --routing-key "sa-workshop-stream" --pmessages 10000 --queue "sa-workshop-stream" --rate 100 --consumer-rate 10 --multi-ack-every 1 -c 10

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

Shovel is an amazing plugin you can leverage to move messages from one to another queue. 

Usecases: 
- Moving messages between queues on same or different cluster

```
docker exec rabbitmq-blue rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://guest:guest@rabbitmq-blue", "src-queue": "sa-workshop", "dest-protocol": "amqp091", "dest-uri": "amqp://guest:guest@rabbitmq-blue", "dest-queue": "sa-workshop-shovelq", "dest-queue-args": {"x-queue-type": "quorum"}}'


docker exec rabbitmq-blue rabbitmqctl set_parameter shovel my-shovel '{"src-protocol": "amqp091", "src-uri": "amqp://guest:guest@rabbitmq-blue", "src-queue": "sa-workshop-shovelq", "dest-protocol": "amqp091", "dest-uri": "amqp://guest:guest@rabbitmq-green", "dest-queue": "sa-workshop-shovelq-green", "dest-queue-args": {"x-queue-type": "quorum"}}'
```

### Routing Messages via Exchanges and routing-key (topic, fanout, )
- Create an exchange named demo
- Bind the queue event to demo exchange with routing-key event.#
- Bind the queue new-event to demo exchange with routing-key new-event.#
- Publish a message via exchange and see how messages are routed to queues event and new-event based on routing keys.

#### Now publish the messages to demo exchange via perf test and see how messages are routed to queues events and new-events based on routing keys.
```

docker exec rabbitmq-blue rabbitmqadmin declare exchange name=demo.exchange type=topic durable=true auto_delete=false

docker exec rabbitmq-blue rabbitmqadmin declare queue name=event durable=true auto_delete=false

docker exec rabbitmq-blue rabbitmqadmin declare queue name=new-event durable=true auto_delete=false

docker exec rabbitmq-blue rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=event routing_key=event.#

docker exec rabbitmq-blue rabbitmqadmin declare binding source=demo.exchange destination_type=queue destination=new-event routing_key=new-event.#

docker exec rabbitmq-blue rabbitmqadmin publish exchange=demo.exchange routing_key=event.test payload="Hello from demo exchange to event"

docker exec rabbitmq-blue rabbitmqadmin publish exchange=demo.exchange routing_key=new-event.test payload="Hello from demo exchange to new-event"

```

#### Perf test to route message via exchange with routing keys
```

docker run --name perf-tst-stream -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri "amqp://guest:guest@rabbitmq-blue" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "event.demo" --pmessages 1000 --rate 100 --consumer-rate 10 --multi-ack-every 10


docker run --name perf-tst-stream-q1 -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri "amqp://amqp://guest:guest@rabbitmq-blue" --producers 10 --consumers 5 --predeclared --exchange demo.exchange --routing-key "new-event.demo" --pmessages 1000  --rate 100 --consumer-rate 10 --multi-ack-every 10
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


### LAB 8: Federation  - Actvie - Active RMQ deployments in Docker

Setting up exchange and queue federation on blue cluster 
```
docker exec rabbitmq-blue  rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@rabbitmq-green:5672"}' 

docker exec rabbitmq-blue  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

docker exec rabbitmq-blue rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues
```

Setting up exchange and queue federation on green cluster 
```
docker exec rabbitmq-green  rabbitmqctl set_parameter federation-upstream origin '{"uri":"amqp://arul:password@rabbitmq-blue:5672"}' 

docker exec rabbitmq-green  rabbitmqctl set_policy exchange-federation "^federated\." '{"federation-upstream-set":"all"}'  --priority 10  --apply-to exchanges

docker exec rabbitmq-green rabbitmqctl set_policy queue-federation ".*" '{"federation-upstream-set":"all"}' --priority 10 --apply-to queues

```

#### Creating queue, exchange, bindinging on both blue & green cluster , publish a message to blue cluster and observe the message on both clusters
```
docker exec rabbitmq-blue rabbitmqadmin declare exchange name=federated.exchange type=fanout durable=true auto_delete=false

docker exec rabbitmq-blue rabbitmqadmin declare queue name=federated-event durable=true auto_delete=false


docker exec rabbitmq-blue rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#

docker exec rabbitmq-green rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=federated-event routing_key=event.#


docker exec rabbitmq-blue rabbitmqadmin publish exchange=federated.exchange routing_key=event.test payload="Hello from demo exchange to event"

docker exec rabbitmq-blue rabbitmqadmin publish exchange=federated.exchange routing_key=new-event.test payload="Hello from demo exchange to new-event"
```

#### Now lets bind all queues to federated exchange on both blue and green RMQ servers.

```
docker exec rabbitmq-blue rabbitmqadmin list queues > queues.txt

for i in `cat queues.txt | awk '{print $2}' | grep -v name` ; do docker exec rabbitmq-blue rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=$i routing_key=event.# ; done

for i in `cat queues.txt | awk '{print $2}' | grep -v name` ; do docker exec rabbitmq-green  rabbitmqadmin declare binding source=federated.exchange destination_type=queue destination=$i routing_key=event.# ; done

```

#### Perf test on federated exchange
```
docker run --name perf-tst-exchange -d --network rmq-network pivotalrabbitmq/perf-test:latest --uri amqp://guest:guest@rabbitmq-blue:5672 --quorum-queue --producers 10 --consumers 5 --predeclared  --pmessages 10000 --exchange "federated.exchange" --routing-key "event.test" --rate 100 --consumer-rate 10 --multi-ack-every 10 -c 10
```

### RabbitMQ Tutorials  cover the basics of creating messaging applications using RabbitMQ.

[RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)

### RabbitMQ Labs for Developers and DevOps Engineers

[RabbitMQ AppDev Labs](https://github.com/ggreen/event-streaming-showcase/tree/main/docs/workshops/Labs/appDev)

#### References:

- https://github.com/ggreen/event-streaming-showcase
- https://www.rabbitmq.com
