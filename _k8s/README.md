# ElastiQuill on Kubernetes

1. Run the setup script from `../_setup` to create the necessary prerequisites on your Elasticsearch cluster. See setup instructions.
2. Update config.yml with your blog's configurations (e.g. blog name, URL, OAuth keys, etc).
3. Create a Kubernetes secret from your config.yml file:
```bash
kubectl create secret generic elastiquill-demo-config --from-file=./config.yml
```
4. (Optional) Configure the Deployment to use your custom theme. See instructions below.
5. Deploy ElastiQuill and it's accompanying service:
```bash
kubectl apply -f elastiquill.yaml
```
6. Get the LoadBalancer IP and browse to your blog. You probably want to configure DNS records and HTTPS (via Ingress) while at it. 

## Using custom themes

See ../README.md for more info on using custom blog themes.

On Kubernetes, you can load the theme files in multiple ways, even directly from the git repository holding the theme files.

* Create config map and mount it (does not support hierarchies, mostly useful for overriding specific files)
* initContainer to clone the repo once
* Sidecar [git-sync](https://github.com/kubernetes/git-sync) container to clone and then update the theme path on changes 

```
      initContainers:
      - name: git-sync
        image: k8s.gcr.io/git-sync:v3.1.1
        volumeMounts:
        - name: theme
          mountPath: /etc/elastiquill-theme
        env:
        - name: GIT_SYNC_REPO
          value: <your theme git theme repository>
        - name: GIT_SYNC_BRANCH
          value: master
        - name: GIT_SYNC_ROOT
          value: /etc/elastiquill-theme
        - name: GIT_SYNC_DEST
          value: theme
        - name: GIT_SYNC_PERMISSIONS
          value: "0777"
        - name: GIT_SYNC_ONE_TIME
          value: "true"
        - name: GIT_SYNC_SSH
          value: "false"
        securityContext:
          runAsUser: 0
```

You can then add a similar container in the pod as a sidecar to continuously pull theme updates from git.
