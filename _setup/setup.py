#!/usr/bin/env python3

import os
import sys
import yaml
import json
import argparse
import requests

JSON_HEADERS = { 'Content-Type': 'application/json' }

def read_config(es_config, variable, env, default=None):
    value = os.environ.get(env)

    if value is None and es_config is not None:
        value = es_config.get(variable)

    if value is None:
        value = default

    print('{} == {}'.format(variable, value))
    return value

def make_put(url, data_path):
    resp = requests.put('http://' + url, data=open(data_path).read(), headers=JSON_HEADERS)
    print(resp.content)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-c', '--config', help='Path to config.yml file', default='../config.yml')
    args = parser.parse_args()

    config = None
    try:
        config = yaml.load(open(args.config, 'r'))
    except Exception as e:
        print(e)
        sys.exit(1)

    es_config = config.get('elasticsearch')
    es_hosts = read_config(es_config, 'hosts', 'ELASTICSEARCH_HOSTS', 'localhost:9200')
    posts_index = read_config(es_config, 'blog-index-name', 'BLOG_POSTS_INDEX', 'blog-posts')
    comments_index = read_config(es_config, 'blog-comments-index-name', 'BLOG_COMMENTS_INDEX', 'blog-comments')
    logs_index = read_config(es_config, 'blog-logs-index-name', 'BLOG_LOGS_INDEX', 'blog-logs')

    for host in es_hosts.split(','):
        print('\nExecuting on', host)

        print('Creating posts index')
        make_put(host + '/' + posts_index, './blog-posts.json')
        print('Creating comments index')
        make_put(host + '/' + comments_index, './blog-comments.json')
        print('Updating ingest pipeline')
        make_put(host + '/_ingest/pipeline/request_log', './request_log.json')

        print('Updating blog-logs index template')
        index_template = json.load(open('./blog-logs.json'))
        index_template['index_patterns'] = logs_index + '*'
        resp = requests.put('http://' + host + '/_template/blog-logs',
                            data=json.dumps(index_template),
                            headers=JSON_HEADERS)
        print(resp.content)
