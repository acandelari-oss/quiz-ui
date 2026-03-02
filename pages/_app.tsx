import type { AppProps } from "next/app";
import Head from "next/head";
import type { AppProps } from 'next/app'
export default function App({ Component, pageProps }: AppProps) {

return (

<>

<Head>

<link

href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap"

rel="stylesheet"

/>

</Head>

<div style={{ fontFamily:"Nunito, sans-serif" }}>

<Component {...pageProps} />

</div>

</>

);

}
