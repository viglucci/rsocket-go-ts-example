package main

import (
	"context"
	"log"

	"github.com/rsocket/rsocket-go"
	"github.com/rsocket/rsocket-go/payload"
)

func main() {

	// Connect to server
	cli, err := rsocket.Connect().
		SetupPayload(payload.Empty()).
		Transport(rsocket.TCPClient().SetHostAndPort("127.0.0.1", 7878).Build()).
		Start(context.Background())

	if err != nil {
		panic(err)
	}

	defer cli.Close()

	// Send request
	result, err := cli.RequestResponse(payload.NewString("Hello World", "")).Block(context.Background())
	if err != nil {
		panic(err)
	}

	log.Println("response:", string(result.Data()))
}
