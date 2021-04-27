import NextDocument, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import theme from 'theme';
import { ColorModeScript } from '@chakra-ui/react';

class Document extends NextDocument {
  public static getInitialProps(ctx: DocumentContext) {
    return NextDocument.getInitialProps(ctx);
  }

  public render() {
    return (
      <Html lang = "en" style = {{ overflowX: 'hidden' }}>
        <Head>
          <meta charSet = "utf-8" />
          <meta name = "description" content = "hello there" />
        </Head>
        <body>
          <ColorModeScript initialColorMode = {theme.config.initialColorMode} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default Document;
