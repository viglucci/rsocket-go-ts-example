package main

import (
	"context"
	"github.com/rsocket/rsocket-go"
	"github.com/rsocket/rsocket-go/extension"
	"github.com/rsocket/rsocket-go/payload"
	"log"
)

func main() {

	// Connect to server
	connector, err := rsocket.Connect().
		SetupPayload(payload.Empty()).
		Transport(rsocket.TCPClient().SetHostAndPort("127.0.0.1", 7878).Build()).
		Start(context.Background())

	if err != nil {
		panic(err)
	}

	defer connector.Close()

	compositeMetadataBuilder := extension.CompositeMetadataBuilder{}
	routes, err := extension.EncodeRouting("echo")
	if err != nil {
		panic(err)
	}
	compositeMetadataBuilder.PushWellKnown(extension.MessageRouting, routes)
	compositeMetadataBuilder.PushWellKnown(extension.MessageMimeType, []byte(extension.TextPlain.String()))
	compositeMetadata, err := compositeMetadataBuilder.Build()
	if err != nil {
		panic(err)
	}

	// Send request
	result, err := connector.RequestResponse(
		payload.New([]byte("Hello World"), compositeMetadata)).
		Block(context.Background())
	if err != nil {
		panic(err)
	}

	log.Println("response:", string(result.Data()))
}
