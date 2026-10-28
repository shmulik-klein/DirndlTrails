import Document, {
  Head,
  Html,
  Main,
  NextScript,
} from "next/document";
import type { DocumentContext, DocumentInitialProps } from "next/document";

type Props = DocumentInitialProps & {
  nonce?: string;
};

class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initialProps = await Document.getInitialProps(ctx);
    const header = ctx.req?.headers["x-nonce"];
    const nonce = Array.isArray(header) ? header[0] : header;

    return { ...initialProps, nonce };
  }

  render() {
    const { nonce } = this.props;

    return (
      <Html lang="en">
        <Head nonce={nonce}>
          <meta name="color-scheme" content="light dark" />
          <meta name="theme-color" content="#059669" />
          <link rel="preconnect" href="https://api.maptiler.com" crossOrigin="" />
        </Head>
        <body>
          <Main />
          <NextScript nonce={nonce} />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
