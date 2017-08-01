FROM ubuntu
MAINTAINER Michael Hess <mlhess@umich.edu>

#####RUN echo "deb http://archive.ubuntu.com/ubuntu precise main universe" > /etc/apt/sources.list
RUN apt-get update
RUN apt-get -y install software-properties-common joe  git build-essential curl apt-transport-https python
RUN curl --silent https://deb.nodesource.com/gpgkey/nodesource.gpg.key |  apt-key add -
RUN VERSION=node_6.x
RUN DISTRO="$(lsb_release -s -c)"
RUN curl -sL https://deb.nodesource.com/setup_8.x |  bash -
RUN apt-get install -y nodejs

# use changes to package.json to force Docker not to use the cache
# when we change our application's nodejs dependencies:
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/app && cp -a /tmp/node_modules /opt/app/

# From here we load our application's code in, therefore the previous docker
# "layer" thats been cached will be used if possible
WORKDIR /opt/app
ADD . /opt/app

EXPOSE 3000

CMD ["node", "server/server.js"]
