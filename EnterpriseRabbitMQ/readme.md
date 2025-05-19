## Install instruction for Enterprise RabbitMQ on Kubernetes.


### Install Cert Manager
```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.5.3/cert-manager.yaml
```

### Grad your Broadcom Support Token form broadcom support portal and set it as an environment variable.
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