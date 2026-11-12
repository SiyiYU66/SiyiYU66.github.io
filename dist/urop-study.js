// Siyi Yu’s research notebook, summer reflection and JLR follow-up. Original plot pixels and colours preserved.
export const uropProject={
  "name": "UROP — Undergraduate Research Opportunity Programme",
  "galleryTitle": "(UROP) Undergraduate Research",
  "hero": "./assets/projects/urop/urop-cover.jpg",
  "heroAlt": "Laboratory headform, laptop and instrumented smartphones prepared for crash-sensing tests",
  "heroFit": "cover",
  "heroPosition": "50% 50%",
  "overview": "Crash-sensing software tested at JLR and 300 MADYMO impact simulations",
  "description": "Android sensor software taken into a Jaguar Land Rover crash test, alongside scripting and analysis of 300 MADYMO simulations.",
  "headline": "From code to real crash tests.",
  "lede": "At Imperial, under Dr Claire Baker’s supervision, I developed an Android crash recorder and took it from laboratory testing into a real Jaguar Land Rover crash test. Alongside the software, I wrote scripts and analysed 300 MADYMO simulations across different human body models.",
  "collection": "Undergraduate research",
  "track": null,
  "caseStudy": {
    "chapters": [
      {
        "label": "Software / Lab",
        "title": "Built to capture more than a trigger.",
        "intro": "I developed an Android crash-recording app using smartphone accelerometer, gyroscope and magnetometer data. Structured event capture and rich metadata made each recording traceable: what triggered it, which settings were active and how the event should be interpreted.",
        "notes": [
          [
            "Engineering the workflow",
            "Continuous sensor logging, configurable impact triggers, orientation markers and clear event labels in the CSV output."
          ],
          [
            "Tested in the lab",
            "Four phones, three repeated drops at 2 m/s. Impact and Portrait Up markers supported repeatable testing without opening the phone case between drops."
          ]
        ],
        "figures": [
          {
            "src": "./assets/projects/urop/study/lab-testing.jpg",
            "width": 1706,
            "height": 1279,
            "caption": "Lab testing · Siyi Yu preparing the helmeted headform and crash recorder",
            "wide": true
          },
          {
            "src": "./assets/projects/urop/study/drop-rig.webp",
            "width": 1279,
            "height": 1706,
            "caption": "Laboratory drop rig · Helmeted headform and inclined impact surface",
            "wide": false
          },
          {
            "src": "./assets/projects/urop/study/lab-setup.webp",
            "width": 1706,
            "height": 1279,
            "caption": "Test preparation · Headform, laptop and instrumented phones",
            "wide": false
          },
          {
            "src": "./assets/projects/urop/study/phone-recording.webp",
            "width": 1706,
            "height": 1279,
            "caption": "Phone-side recorder · Live sensors and selectable impact thresholds",
            "wide": false
          }
        ]
      },
      {
        "label": "Software / JLR crash test",
        "title": "A real crash. A recorded response.",
        "intro": "I took my recorder into a Jaguar Land Rover crash test, then processed and organised the eight-phone dataset. Phone004’s approximately 68-minute session captured the impact across all three sensors. These four plots move from session-level recording to the pulse and the sensor’s measurement limits.",
        "figures": [
          {
            "src": "./assets/projects/urop/study/jlr-post-crash.jpg",
            "width": 1785,
            "height": 1279,
            "caption": "JLR real-world crash test · Vehicle after impact",
            "wide": true
          },
          {
            "src": "./assets/projects/urop/study/jlr-01-overview.png",
            "width": 1784,
            "height": 1382,
            "caption": "01 / Full session · Approximately 68 minutes, with the impact trigger marked. The overview places the crash within a long recording; handling activity is visible near the session boundaries.",
            "wide": true,
            "background": "#ffffff"
          },
          {
            "src": "./assets/projects/urop/study/jlr-02-window.png",
            "width": 1784,
            "height": 1382,
            "caption": "02 / Impact window · ±2 seconds. Acceleration, angular rate and magnetic field respond around the recorded trigger, with a rapid onset followed by oscillation and decay.",
            "wide": true,
            "background": "#ffffff"
          },
          {
            "src": "./assets/projects/urop/study/jlr-03-pulse.png",
            "width": 1781,
            "height": 731,
            "caption": "03 / Crash pulse · ±0.3 seconds. Recorded resultant acceleration rises from approximately 1g to 227 m/s² (about 23g), then oscillates and decays.",
            "wide": true,
            "background": "#ffffff"
          },
          {
            "src": "./assets/projects/urop/study/jlr-04-saturation.png",
            "width": 1634,
            "height": 731,
            "caption": "04 / Saturation · Y/Z samples flatten near the ±16g axis limits. Clipping means the recorded resultant does not establish the true peak.",
            "wide": true,
            "background": "#ffffff"
          }
        ],
        "notes": [
          [
            "What I demonstrated",
            "The app detected and captured a genuine crash event, producing interpretable multi-sensor data for follow-up analysis."
          ],
          [
            "The engineering questions that followed",
            "Phone mounting, sampling rate and comparison with a professional reference system. The plots are an initial consistency check, rather than a calibrated accuracy measurement."
          ]
        ]
      },
      {
        "label": "MADYMO / Simulation & analysis",
        "title": "300 simulations. A critical eye on the model.",
        "intro": "I analysed 300 MADYMO simulations across different human body models, using scripts to process unfamiliar datasets and investigate pedestrian-impact responses. Literature on lower-limb behaviour helped me frame what to examine in the outputs.",
        "notes": [
          [
            "Beyond the black box",
            "When a response behaved unexpectedly, I investigated the model behind it instead of accepting the output at face value."
          ],
          [
            "What I brought to the work",
            "Scripting, simulation-output analysis and engineering judgement: questioning what a model can—and cannot—tell us."
          ]
        ]
      },
      {
        "label": "DTS / Hardware troubleshooting",
        "title": "Follow the problem across the system.",
        "intro": "I investigated a DTS/SLICE hardware fault and worked with the DTS team to narrow down the cause, combining hands-on troubleshooting with clear technical communication.",
        "acknowledgements": [
          {"name":"Dr Claire Baker","href":"https://www.linkedin.com/in/claire-baker-phd-60836a135/","contribution":"For supervision."},
          {"name":"Professor Mazdak Ghajari","href":"https://www.linkedin.com/in/mazdak-ghajari-303454b/","contribution":"For welcoming me into the research community."},
          {"name":"Dr Will Dawber","href":"https://www.linkedin.com/in/will-dawber-5aa65411a/","contribution":"For guidance through DTS/SLICE troubleshooting."}
        ]
      }
    ],
    "links": [
      {
        "label": "Explore the full research notebook",
        "href": "https://app.notion.com/p/UROP-Research-Notebook-Siyi-Yu-3efeb430ec0880359940c458d49ac1c8"
      }
    ]
  },
  "credits": [
    [
      "HOSTED BY",
      "Dyson School of Design Engineering"
    ],
    [
      "IN COLLABORATION WITH",
      "JLR / DTS"
    ],
    [
      "FUNDED BY",
      "Imperial College London"
    ],
    [
      "SUPERVISED BY",
      "Dr Claire Baker",
      "https://www.linkedin.com/in/claire-baker-phd-60836a135/"
    ]
  ]
};
