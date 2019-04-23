FROM golang
MAINTAINER Ran Ever-Hadani <raanraan@gmail.com>
WORKDIR /go/src/no-client
ADD . .
RUN apt-get update -yq \
    && apt-get install curl gnupg -yq \
    && curl -sL https://deb.nodesource.com/setup_8.x | bash \
    && apt-get install nodejs -yq
RUN npm install
RUN npm run build
RUN go get
RUN go build
EXPOSE 8080
CMD ["./no-client"]
