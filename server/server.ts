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

let serverCloseable: Closeable;

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
          const timeout = setTimeout(
            () => {
              const payloadData = payload.data || Buffer.alloc(0);
              const data = Buffer.concat([Buffer.from("Echo: "), payloadData]);
              responderStream.onNext(
                { data },
                true
              )
              console.log("response sent...")
            },
            1000
          );
          console.log("responding after 1 second...");
          return {
            cancel: () => {
              clearTimeout(timeout);
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
