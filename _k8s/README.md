# ElastiQuill on Kubernetes

1. Run the setup script from `../_setup` to create the necessary prerequisites on your Elasticsearch cluster. See setup instructions.
2. Update config.yml with your blog's configurations (e.g. blog name, URL, OAuth keys, etc).
3. Create a Kubernetes secret from your config.yml file:
```bash
kubectl create secret generic elastiquill-demo-config --from-file=./config.yml
```
4. Deploy ElastiQuill and it's accompanying secret:
```bash
kubectl apply -f elastiquill.yaml
```
5. Get the LoadBalancer IP and browse to your blog. You probably want to configure DNS records and HTTPS (via Ingress) while at it. 

Enjoy!
