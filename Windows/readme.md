
### Install the choco installer
[https://chocolatey.org/install](https://chocolatey.org/install)

### Follow the steps to install RabbitMQ on windows
[https://www.rabbitmq.com/docs/install-windows](https://www.rabbitmq.com/docs/install-windows)

```
choco install rabbitmq
```

### Perftest Samples
```
######################## powershell loop
while (0 -lt 1) { java -jar perf-test-2.21.0.jar -st 30   --producers 10 --consumers 10 --predeclared --routing-key "ssfcu-demo"  --queue "ssfcu-demo" --rate 100 --consumer-rate 50 --multi-ack-every 50  --producer-random-start-delay 17  --pmessages 100   ;Write-Output "Round complete at $(Get-Date)" ; sleep 5 ; }

while (0 -lt 1) { java -jar perf-test-2.21.0.jar -st 30   --producers 10 --consumers 10 --predeclared --routing-key "fcu-demo-3"  --queue "fcu-demo-3" --rate 100 --consumer-rate 10 --multi-ack-every 10  --producer-random-start-delay 17  --pmessages 100   ;Write-Output "Round complete at $(Get-Date)" ; sleep 5 ; }

while (0 -lt 1) { java -jar perf-test-2.21.0.jar -st 30   --producers 10 --consumers 10 --predeclared --routing-key "checking-account"  --queue "checking-account" --rate 100 --consumer-rate 10 --multi-ack-every 10  --producer-random-start-delay 17  --pmessages 100   ;Write-Output "Round complete at $(Get-Date)" ; sleep 17 ; }

 while (0 -lt 1) { java -jar perf-test-2.21.0.jar -st 30   --producers 10 --consumers 10 --predeclared --routing-key "credit-cards"  --queue "credit-cards" --rate 100 --consumer-rate 50  --producer-random-start-delay 17  --pmessages 100  -c 50 -a --polling-interval 19  ;Write-Output "Round complete at $(Get-Date)" ; sleep 17 ; }

```