// Project evidence supplied by Siyi Yu: Challenge 4 (aespa) and Challenge 5 (push).
// Technical context: Electronics 2 Lab 6, Lab 7 and the Challenge 4 brief.
// The dance uses stabilizers; it is not presented as a self-balancing demo.
const media='./assets/projects/balancing-segway/';

export const segwayProject={
  id:'balancing-segway',art:8,demo:false,
  name:'Balancing Segway',discTitle:'Balancing Segway',discSubtitle:'BEAT DETECTION / PID CONTROL',
  year:'2026',category:'Robotics / Control Systems',role:'Embedded Software & Control',
  cover:media+'pybench.webp',coverInk:'#202320',
  coverCrop:{fit:'disc',zoom:.84,positionX:.5,positionY:.68,background:'#e8e8e4'},
  hero:media+'balancing-tabletop.png',heroAlt:'The two-wheeled PyBench robot balancing upright on a tabletop during a hands-on test',
  heroFit:'contain',heroBackground:'#141b21',
  overview:'Beat-synchronised motion and self-balancing control on PyBench',
  description:'A MicroPython robot exploring live beat detection, choreographed motion and 200 Hz self-balancing control.',
  headline:'Listening for rhythm. Finding balance.',
  lede:'One two-wheeled robot, two Electronics 2 challenges: turn live music into dance moves with stabilizers, then use sensor fusion and PID control to balance and recover from a push.',
  collection:'Electronics 2',
  credits:[['COURSE','Electronics 2'],['BUILT WITH','MicroPython · PyBench']],
  caseStudy:{
    chapters:[
      {
        label:'The platform',title:'One robot. Two real-time challenges.',
        intro:'Built in MicroPython on the PyBench board for Electronics 2, the robot connects a microphone, IMU and two driven wheels. The same platform becomes a beat-responsive dancer and a self-balancing control system.',
        notes:[['Challenge 4','Detect music beats and step through a dance routine, with stabilizers.'],['Challenge 5','Estimate tilt and drive the wheels to stay upright and respond to disturbances.']],
        figures:[{src:media+'pybench.webp',width:1000,height:848,caption:'PyBench board · Pyboard, IMU, microphone, motor driver and screen',wide:true,background:'transparent',borderless:true}]
      },
      {
        label:'Challenge 4 / Beat detection',title:'Hear the beat. Move with it.',
        intro:'Live microphone audio becomes a sequence of motor moves. Short bursts of sound energy are compared with a local moving average; a detected beat advances the next step in the choreography. Stabilizers support the robot throughout this dance.',
        notes:[
          ['Listen · 8 kHz','Timer interrupts capture 160 microphone samples per block: a fresh energy measurement every 20 milliseconds.'],
          ['Detect · relative energy','A running-sum buffer tracks the local average. The energy ratio and a minimum interval between detections help separate beats from repeated triggers.'],
          ['Move · one step per beat','The ASCII dance routine is loaded from the SD card into memory before the loop starts, keeping slow file reads out of live control.'],
          ['Watch with sound','The aespa demonstration shows the stabilizer-supported dance responding to music. Use the player controls to hear the rhythm.']
        ],
        figures:[{type:'video',src:media+'challenge-4-aespa.mp4',poster:media+'challenge-4-poster.webp',width:1920,height:1080,wide:true,caption:'Challenge 4 · Beat-triggered dancing to aespa, with stabilizers'}]
      },
      {
        label:'Challenge 5 / Self-balancing',title:'Stay upright. Recover from a push.',
        intro:'The IMU estimates tilt with a complementary filter: 95% gyro-based motion and 5% accelerometer reference. Every 5 milliseconds, a PID loop compares that estimate with upright and corrects both motors. The push test puts that closed-loop response into view.',
        notes:[['Sensor fusion','The gyroscope follows fast motion; the accelerometer corrects slow drift.'],['200 Hz control','Proportional, integral and derivative terms combine into the wheel command.']],
        pid:{
          terms:[
            {term:'P',name:'Proportional',gain:'p',meaning:'The current tilt error sets the corrective push. A larger error produces a stronger motor command.',excess:'Too much P makes the robot oscillate around upright.'},
            {term:'I',name:'Integral',gain:'i',meaning:'Accumulated error removes a persistent offset that the proportional term alone cannot correct.',excess:'Too much I causes wind-up and overshoot.'},
            {term:'D',name:'Derivative',gain:'d',meaning:'The gyroscope rate damps the response as the robot approaches upright, helping it settle instead of swinging past.',excess:'Too much D makes the controller sensitive to sensor noise.'}
          ],
          tuning:{
            title:'One gain at a time.',
            text:'We suspended the robot from elastic cord while tuning, watched how it failed and identified which control term was responsible. Changing one gain at a time helped separate oscillation, steady offset and overshoot, until the robot stood on its own.',
            rateNote:'The derivative term uses the measured gyroscope rate. This avoids differentiating angle estimates over a very small time step, which can amplify noise.'
          }
        },
        figures:[{type:'video',src:media+'challenge-5-push.mp4',poster:media+'challenge-5-poster.webp',width:1920,height:1080,wide:true,caption:'Challenge 5 · Self-balancing and recovery during a hands-on push test'}]
      }
    ],
    resourcesLabel:'Course & hardware',
    links:[{label:'Professor Peter Cheung · Imperial College London',href:'http://www.ee.ic.ac.uk/pcheung/'}]
  }
};
