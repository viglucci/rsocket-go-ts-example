import {
  Closeable,
  OnExtensionSubscriber,
  OnNextSubscriber,
  OnTerminalSubscriber,
  Payload,
  RSocketServer,
} from "rsocket-core";
import {TcpServerTransport} from "rsocket-tcp-server";
import {exit} from "process";
import net from "net";
import {decodeCompositeMetadata, decodeRoutes, WellKnownMimeType} from "rsocket-composite-metadata";
import MESSAGE_RSOCKET_ROUTING = WellKnownMimeType.MESSAGE_RSOCKET_ROUTING;

let serverCloseable: Closeable;

function mapMetaData(payload: Payload) {
  const mappedMetaData = new Map<string, any>();
  if (payload.metadata) {
    const decodedCompositeMetaData = decodeCompositeMetadata(payload.metadata);

    for (let metaData of decodedCompositeMetaData) {
      switch (metaData.mimeType) {
        case MESSAGE_RSOCKET_ROUTING.toString(): {
          const tags = [];
          for (let decodedRoute of decodeRoutes(metaData.content)) {
            tags.push(decodedRoute);
          }
          const joinedRoute = tags.join(".");
          mappedMetaData.set(MESSAGE_RSOCKET_ROUTING.toString(), joinedRoute);
          break;
        }
        default: {
          if (metaData.mimeType) {
            mappedMetaData.set(metaData.mimeType.toString(), metaData.content.toString());
          }
        }
      }
    }
  }
  return mappedMetaData;
}

function makeServer(listenOptions: net.ListenOptions) {
  return new RSocketServer({
    transport: new TcpServerTransport({
      listenOptions,
    }),
    acceptor: {
      accept: async () => ({
        requestResponse: (
          payload: Payload,
          responderStream: OnTerminalSubscriber &
            OnNextSubscriber &
            OnExtensionSubscriber
        ) => {
          const metaData = mapMetaData(payload);
          const route = metaData.get(MESSAGE_RSOCKET_ROUTING.toString());
          switch (route) {
            case "echo": {
              const payloadData = payload.data || Buffer.alloc(0);
              const responseData = Buffer.concat([Buffer.from("Echo: "), payloadData]);
              responderStream.onNext(
                { data: responseData },
                true
              )
              console.log(`responded with: [data: ${responseData.toString()}]`)
              break;
            }
            default: {
              responderStream.onError(new Error("Unknown or missing route."))
            }
          }
          return {
            cancel: () => {
              console.log("cancelled");
            },
            onExtension: () => {
              console.log("Received Extension request");
            },
          };
        },
      }),
    },
  });
}

async function main() {
  const listenOptions = {
    host: "127.0.0.1",
    port: 7878
  }
  const server = makeServer(listenOptions);
  serverCloseable = await server.bind();
  console.log(`server listening... [host: ${listenOptions.host}, port: ${listenOptions.port}]`)
  return new Promise((resolve, reject) => {
    serverCloseable.onClose( (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(null);
    });
  });
}

main()
  .then(() => exit())
  .catch((error: Error) => {
    console.error(error);
    exit(1);
  })
  .finally(() => {
    serverCloseable.close();
  });
