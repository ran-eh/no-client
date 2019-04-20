FROM golang
MAINTAINER Ran Ever-Hadani <raanraan@gmail.com>
WORKDIR /go/src/no-client
ADD . .
RUN go get
RUN go build
EXPOSE 8000:8000
CMD ["./no-client"]
