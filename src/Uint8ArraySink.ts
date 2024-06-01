export class Uint8ArraySink extends WritableStream<Uint8Array> {
  data: Uint8Array = new Uint8Array();

  constructor(options?: Omit<UnderlyingSink<Uint8Array>, "write">) {
    super({
      ...options,
      write: (chunk) => {
        this.data = new Uint8Array([...this.data, ...chunk]);
      },
    });
  }
}
