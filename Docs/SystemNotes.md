## Components used to run

  * nvm.  This allows installing versions of NodeJS
  * node. Installed via NVM
  * PM2.  This is a system that monitors and restarts the app if it fails.

Since talking to the GPIO pins from Node requires root privleges, I had to
jump thru some hoops to get PM2 to run using sudo (giving it root privs)

I've created an alias in the "k7id" users environment to allow easy access.
See /home/k7id/.bash_aliases 

Note that the application and user are called the same... k7id

Common commands when logged in as the user k7id would be:
spm2 list
   (If the k7id app isn't listed)
cd ~/K7ID_controller
spm2 start pm2.json

   (Then you have the usual commands)
spm2 restart k7id
spm2 stop k7id
spm2 start k7id
spm2 delete k7id

    (make any needed changes in pm2.json and reload it)
spm2 start pm2.json

    (if you make any changes)
spm2 save

Now when the system is rebooted, it will automatically start up with the new version.

## Sound considerations

Everytime the system is rebooted, the Card # for the USB Audio Adapter may change.  So the code in tts.js must look for it by name prior to building the commands to talk with it.  

```bash
aplay -l
```
will give a list of all audio devices.  
Look for 
```
card 1: Audio [AB13X USB Audio], device 0: USB Audio [USB Audio]
```
In this case it's card 1, device 0.
tts.js will find it and when the commands are built, it will talk to card 1, device 0.

