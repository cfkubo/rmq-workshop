k create ns downstream-rmq

kubectl apply -f rmq-upstream.yaml
kubectl apply -f rmq-downstream.yml -n downstream-rmq


kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator


kubectl -n downstream-rmq exec downstream-rabbit-new-server-0 -- rabbitmqctl add_user arul password
kubectl -n downstream-rmq exec downstream-rabbit-new-server-0 -- rabbitmqctl set_permissions  -p / arul ".*" ".*" ".*"
kubectl -n downstream-rmq exec downstream-rabbit-new-server-0 -- rabbitmqctl set_user_tags arul administrator





# assuming we want forward message published to exchange ams.* from broker A to broker B
# there is no any configuration update on broker A except credential needed by B to connect the upstream
# see https://www.rabbitmq.com/federation.html for details


# do these on broker B

# enable rabbitmq federation plugin
rabbitmq-plugins enable rabbitmq_federation

# enable rabbitmq federation web management plugin
rabbitmq-plugins enable rabbitmq_federation_management

# restart the broker
service rabbitmq-server restart


# create a queue for testing purpose
rabbitmqadmin declare queue name=event durable=true auto_delete=false

# create binding for it
rabbitmqadmin declare binding source=amq.topic destination_type=queue destination=event routing_key=amq.event

# define the upstream, this will create a binding on upstream broker
rabbitmqctl set_parameter federation-upstream my-upstream '{"uri":"amqp://arul:password@:downstream-rabbit-new.downstream-rmq.svc.cluster.local:15672","exchange":".*^","upstream_policy":"all","expires":3600000,"max-hops":1,"max-length":1000,"max-length-bytes":5242880,"max-age":3600000,"ack-mode":"on-confirm","delivery-limit":1000000,"queue-mode":"default"}'

rabbitmqctl set_parameter federation-upstream my-upstream '{"uri":"amqp://arul:password@downstream-rabbit-new.downstream-rmq.svc.cluster.local:5672","exchange":".*^","upstream_policy":"all","expires":3600000,"max-hops":1,"ack-mode":"on-confirm"}'

# define the exchanges that will be federated, upstream broker must have the defined exchange
kubectl -n default exec upstream-rabbit-new-server-0 --  rabbitmqctl set_policy --apply-to exchanges federate-me ".*" '{"federation-upstream-set":"all"}'


kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_policy --apply-to exchanges federate-exchanges ".*" '{"federation-upstream-set":"all"}'
kubectl -n default exec upstream-rabbit-new-server-0 -- rabbitmqctl set_policy --apply-to queues federate-queues ".*" '{"federation-upstream": "all"}'





# try to publish a message on broker A and see
rabbitmqadmin publish exchange=amq.topic routing_key=amq.event payload="Hello Rabbit!"


# check whether the message is forwarded to broker B, you should get a message contains 'Hello Rabbit!'
rabbitmqadmin get queue=event requeue=false


rabbitmqctl set_policy --apply-to exchanges federate-me "^federate\." '{"federation-upstream-set":"all"}'


rabbitmqadmin declare exchange name=customers type=direct


# Declare customers exchange
rabbitmqadmin declare exchange name=customers type=direct
# Declare Queues
rabbitmqadmin  declare queue name=customers.us durable=true
rabbitmqadmin  declare queue name=customers.de durable=true

# Declare Bindings
rabbitmqadmin  declare binding source=customers destination=customers.us routing_key=us
rabbitmqadmin  declare binding source=customers destination=customers.de routing_key=de
