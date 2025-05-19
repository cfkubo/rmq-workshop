
```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.5.3/cert-manager.yaml
```

```
export token="<YOUR-BROADCOM-SUPPORT-TOKEN-FOR-RMQ-K8S>"
```

```
helm registry login rabbitmq-helmoci.packages.broadcom.com -u username -p $token 
```

```
kubectl create ns rabbitmq-system
```

```
kubectl create secret docker-registry tanzu-rabbitmq-registry-creds --docker-server "rabbitmq.packages.broadcom.com" --docker-username "<your broadcom email>" --docker-password $token -n rabbitmq-system
```

```
helm install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --namespace rabbitmq-system
```

<!-- 
```
helm -n rabbitmq-system install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --set rabbitmqImage.repository="vmware-tanzu-rabbitmq-arm64"
```
helm -n rabbitmq-system install tanzu-rabbitmq oci://rabbitmq-helmoci.packages.broadcom.com/tanzu-rabbitmq-operators --set rabbitmqImage.repository="rabbitmq-kubernetes.packages.broadcom.com/tanzu-rabbitmq-package-repo:3.13.3-arm64"
``` -->

kubectl apply -f https://raw.githubusercontent.com/rabbitmq/cluster-operator/main/docs/examples/hello-world/rabbitmq.yaml
```


```
kubectl apply -f rmq-upstream.yaml

kubectl create ns rmq-downstream

kubectl apply -f rmq-downstream.yml
```