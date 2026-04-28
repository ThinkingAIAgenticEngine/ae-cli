FROM docker-ta.thinkingdata.cn/idp/node_builder:19.2.0-slim

COPY package.json /tmp/package.json
RUN npm install -g @tant/ae-cli@$(node -p "require('/tmp/package.json').version") --registry=https://npm.thinkingdata.cn:3443

RUN mkdir -p /root/ae-cli && cp -rp $(npm root -g)/@tant/ae-cli/* /root/ae-cli/