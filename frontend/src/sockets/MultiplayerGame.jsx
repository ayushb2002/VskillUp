import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const MultiplayerGame = () => {
    
    const { roomId } = useParams();
    const [loggedIn, setLoggedIn] = useState(false);
    const [email, setEmail] = useState(sessionStorage.getItem('email'));
    const [socket, setSocket] = useState(io.connect('http://localhost:3000'));
    const [answer, setAnswer] = useState('');
    const [messages, setMessages] = useState(['**** Start of chat ****']);
    const [started, setStarted] = useState(false);
    const [word, setWord] = useState('');
    const [meaning, setMeaning] = useState('');
    const [populate, setPopulate] = useState(messages.map(message => <li>{message}</li>));
    const [disabled, setDisabled] = useState(false);
    const [finished, setFinished] = useState(false);
    const [tableData, setTableData] = useState([]);
    const [populateTable, setPopulateTable] = useState(tableData.map((row) => 
    <tr key={row[0]}>
        <td>{row[0]}</td>
        <td>{row[1]}</td>
        <td>{row[2]}</td>
    </tr>
    ));

    useEffect(() => {
        if(sessionStorage.getItem('loggedIn') != "true")
        {
            window.location.href = '/logout';
        }
        else
        {
            setLoggedIn(true);
        }

        socket.on(`receive_message_${roomId}`, (data) => {
            try
            {   
                if(data.user)
                    messages.push(data.user);
                if(data.email && data.message)
                    messages.push(`${data.email}: ${data.message}`);
            }
            catch (err)
            {
                console.log(err);
            }
            setPopulate(messages.map((message, index)=> <li key={index}>{message}</li>));
        });

        socket.on(`trigger_start_${roomId}`, (data) => {
            triggerGame(data.word);
        });
        
    }, [socket]);

    const leaveRoom = async (e) => {
        e.preventDefault();
        toast('Exiting...');
        socket.emit('disconnectRoom', {roomId: roomId, user:email});
        const response = await fetch('http://127.0.0.1:5000/clearRoomCache', {
            method: 'GET'
        });
        const result = await response.json();
        console.log(result);
        toast.success('Exited!');
        window.location.href = '/game';
    }

    const sendMessage = (e) => {
        e.preventDefault();
        messages.push(`You: ${answer}`);
        setPopulate(messages.map((message, index)=> <li key={index}>{message}</li>));
        socket.emit("send_message", {message: answer, roomId: roomId, email: email});
    }

    const saveMeaning = async (e) => {
        e.preventDefault();
        toast.success('Answer received!');
        setDisabled(true);
        if(meaning == '')
        {
            setMeaning('$');
        }
        const formData = new FormData();
        formData.append('email', email);
        formData.append('word', word);
        formData.append('answer', meaning);
        formData.append('roomId', roomId);
        const response = await fetch('http://127.0.0.1:5000/multiplayerStore', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result['registered'])
        {
            console.log(result);
        }
    }

    const startGame = async (e) => {
        e.preventDefault();
        setStarted(true);
        setFinished(false);
        messages.push(`You started the game!`);
        setPopulate(messages.map((message, index)=> <li key={index}>{message}</li>));
        socket.emit('send_message', {
            message: `Started the game`, 
            roomId: roomId, 
            email: email
        });
        const response = await fetch('http://127.0.0.1:5000/multiplayerGame', {
            method: 'GET'
        });

        const result = await response.json();
        setWord(result['word']);
        socket.emit('start_game', {
            word:result['word'],
            roomId:roomId,
            email:email
        });
        setTimeout(() => {
            setMeaning('');
            setStarted(false);
            setWord('');
            toast('Loading results...');
            setTimeout(async () => {
                console.log(await displayResults());
            }, 3000);
            setFinished(true);
        }, 15000);
    }

    const triggerGame = (word) => {
        setStarted(true);
        setFinished(false);
        setWord(word);
        setTimeout(() => {
            setMeaning('');
            setStarted(false);
            setWord('');
            toast('Loading results...');
            setTimeout(async () => {
                console.log(await displayResults());
            }, 3000);
            setFinished(true);
        }, 15000);
    }

const displayResults = async () => {
    const formData = new FormData();
    formData.append('roomId', roomId);
    const response2 = await fetch('http://127.0.0.1:5000/multiplayerGame', {
        method: 'POST',
        body: formData
    });

    const result2 = await response2.json();
    setTableData([]);
    let keys = Object.keys(result2);
    keys.map(key => {
        let arr = [];
        arr.push(key);
        arr.push(result2[key]['result']);
        arr.push(result2[key]['answer']);
        tableData.push(arr);
    });

    setPopulateTable(tableData.map((row) => 
        <tr key={row[0]}>
            <td>{row[0]}</td>
            <td>{row[1]}</td>
            <td>{row[2]}</td>
        </tr>
    ));

    return tableData;
}

  return (
    <div>
        <Navbar />
        <div className='grid grid-cols-3 p-5'>
            <div className='col-span-3 p-5 flex justify-center'>
                <span className='text-3xl font-bold'>Multiplayer Game Room - {roomId}!</span>
            </div>
            <div className='flex justify-start'>
                {!started && (
                    <>
                        <button onClick={startGame} className='btn'>Start</button>  
                    </>
                )}
            </div>
            <div className='flex justify-center'>
                    {started && (
                        <>
                            <span className='text-lg'>Time to answer - 15 seconds</span>
                        </>
                    )}
            </div>
            <div className='flex justify-end'>
                <button onClick={leaveRoom} className='btn'>Leave</button>
            </div>
            <div className='col-span-2'>
                {started && (
                    <div className='px-5 grid grid-rows-2 my-2'>
                        <div className='my-2'>
                            <span className='text-2xl'>{word}</span>
                        </div>
                        <div className='my-2'>
                            <form onSubmit={saveMeaning}>
                                <div className='form-control my-2'>
                                    <label htmlFor="meaning" className='label'>
                                        <span className='text-label'>Enter meaning</span>
                                    </label>
                                    <input type="text" name="meaning" className="input input-bordered" onChange={(e) => setMeaning(e.target.value)}/>
                                </div>
                                <div className='form-control flex justify-center my-2'>
                                    <button type='submit' className='btn btn-success w-[15vw]' disabled={disabled} >Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {finished && (
                    <div className='p-5'>
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Accuracy</th>
                                    <th>Answer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {populateTable}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className='grid grid-rows-2 p-5'>
                <div className='p-5'>
                    <ul>
                        {populate}
                    </ul>
                </div>
                <div className=''>
                    <form onSubmit={sendMessage}>
                        <div className='form-control'>
                            <label htmlFor="message">
                                <span className='label-text'>Message</span>
                            </label>
                            <input type="text" name="message" className='input input-bordered' onChange={(e) => setAnswer(e.target.value)} />
                        </div>
                        <div className='form-control mt-2'>
                            <button type='submit' className='btn btn-success w-[7vw]'>Send</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <Footer />
    </div>
  )
}

export default MultiplayerGame