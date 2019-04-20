package main

import (
	"flag"
	"log"
	"net/http"
)

var addr = flag.String("addr", "localhost:8080", "http service address")

func main() {
	http.Handle("/", http.FileServer(http.Dir("./dist")))
	log.Printf("Client service starting at %s\n", *addr)

	log.Fatal(http.ListenAndServe(*addr, nil))
}