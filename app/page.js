// `app/page.js` is the UI for the `/` URL
import React from 'react';
import ButtonExample from '@/components/ButtonExample';
//import RootLayout from './layout';

export default async function MainPage() {
  let data = await fetch('https://api.vercel.app/blog');
  let posts = await data.json();
  return (
    <div>
      <h1>Hello World</h1>
      <ButtonExample />
      <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
      </ul>
    </div>
  )
}


/*
const HomePage = () => {
  return (
    <RootLayout>
      <h1>Multi-Page Form</h1>
    </RootLayout>
  );
};

export default HomePage;  */