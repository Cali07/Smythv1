import { Agent, Scope } from '@smythos/sdk';

async function main() {
    //in this example, the image is processed by the native agent LLM
    

    const agent = new Agent({
        id: 'image-analyser',        
        name: 'Image Analyser',
        behavior: 'You are an image analyser. You are given an image and you need to analyse it',
        model: 'gpt-4o',
    });



    const prompt = await agent.prompt('Describe this image please ', {
        //you can pass your attachments in files array
        //it supports local files, remote urls, smythfs:// urls, Buffers or Blobs
        files: ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/VanGogh-starry_night_ballance1.jpg/960px-VanGogh-starry_night_ballance1.jpg'],
    });
    console.log(prompt);


}

main();
