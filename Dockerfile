FROM golang
MAINTAINER Ran Ever-Hadani <raanraan@gmail.com>
WORKDIR /go/src/no-client
ADD . .
RUN go get
RUN go build
EXPOSE 8080
CMD ["./no-client"]
