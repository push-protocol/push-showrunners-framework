import { Inject, Service } from "typedi";
import { Logger } from "winston";
import config from "../../config";
import settings from "./lensSettings.json";
import { EPNSChannel } from "../../helpers/epnschannel";
import {keys} from "./lensKeys";
import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import { ethers } from "ethers";
import axios from "axios";
import {
  isCommentPublication,
  isMirrorPublication,
  isPostPublication,
  isQuotePublication,
} from "@lens-protocol/client";
import { lensClient } from "./client";

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;

@Service()
export default class LensChannel extends EPNSChannel {
  model: any;
  constructor(
    @Inject("logger") public logger: Logger,
    @Inject("cached") public cached
  ) {
    super(logger, {
      networkToMonitor: config.web3MainnetNetwork,
      dirname: __dirname,
      name: "Lens",
      url: "https://lens.xyz/",
      useOffChain: true,
      address: "0x831Fda3157d05559E1326c98EE3232a3e06fFB2a",
      isPolygon: true,
    });
  }

  /**
   * The method responsible for responding to all API CALLS to the webhook;
   */
  public async handler(payload: any) {
    const { Message } = payload;
    // @dev change Message || JSON.parse(Message); to JSON.parse(Message); after testing
    let { type, data } = JSON.parse(Message);
    // this.logInfo(type);
    /*     const messageMeta = settings[type];
    if (!messageMeta) {
      return; //this.logInfo(`${type} is not currently supported`);
    } */
    try {
      if (type === "METADATA_PUBLICATION_COMPLETE") {
        if (data.publicationType === "POST") {
          this.postPublished(data);
        } else if (data.publicationType === "COMMENT") {
          this.commentPublished(data);
        } else {
          this.quotePublished(data);
        }
      } else if (type === "MIRROR_CREATED") {
        this.mirrorPublished(data);
      } else if (type === "PROFILE_MENTIONED") {
        this.profileMentioned(data);
      } else if (type === "PUBLICATION_REACTION_ADDED") {
        this.publicationReactionAdded(data);
      } else if (type === "PROFILE_FOLLOWED") {
        this.profileFollowed(data);
      } else if (type === "PUBLICATION_COLLECTED") {
        this.publicationCollected(data);
      } else {
        this.logInfo(`${type} is not supoorted`);
      }
    } catch (err) {
      this.logInfo("\n\n\n");
      this.logInfo({ err, type, data });
      this.logInfo("\n\n\n");
    }
  }

  public async postPublished(payload: any) {
    try {
      let pubId = payload.serverPubId;

      let url = `https://hey.xyz/posts/${pubId}`;
      let result;
      try {
        result = await lensClient.publication.fetch({
          forId: pubId,
        });
      } catch (e) {
        this.logInfo(e.message);
      }

      const {
        by: {
          ownedBy: { address },
          handle: { localName },
        },
      } = result;

      // notification for the person who published the post
      let publisherMessage = `🌿 Click to view the post! 🌿`;
      let publisherTitle = "Your post was published 🥳";
      await this.sendNotificationHelper(
        publisherTitle,
        publisherMessage,
        address,
        url
      );

      //   try {
      //     result = await lensClient.profile.followers({
      //       of: payload.profileId,
      //     });
      //   } catch (e) {
      //     this.logInfo(e.message);
      //   }

      //   let followerAddresses: any = [];
      //   while(result.items) {
      //     for (let profile of result.items) {
      //       followerAddresses.push(profile.handle.ownedBy);
      //     }
      //     result = await result.next();
      //   };

      //   // notification for the publisher's followers
      //   let followersMessage = `🌿 Click to view the post! 🌿`;
      //   let followersTitle = `${localName} published a new post! 👀`;
      //   await this.sendNotificationHelper(
      //     followersMessage,
      //     followersTitle,
      //     followerAddresses,
      //     url
      //   );
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async commentPublished(payload: any) {
    try {
      let pubId = payload.serverPubId;

      let url = `https://hey.xyz/posts/${pubId}`; // change to comment addr, not post addr
      let result;

      result = await lensClient.publication.fetch({
        forId: pubId,
      });
      const {
        by: {
          handle: { localName },
        },
      } = result;

      const {
        root: {
          by: {
            ownedBy: { address },
          },
        },
      } = result;

      let message = `🌿 Click to view the comment! 🌿 `;
      let title = `${localName} commented on your post 👀`;
      this.sendNotificationHelper(title, message, address, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async mirrorPublished(payload: any) {
    try {
      let profileId = payload.mirrorParams.profileId;
      let pubId = payload.serverPubId;

      let url = `https://hey.xyz/posts/${pubId}`; // change to mirror addr, not post addr
      let result;

      try {
        result = await lensClient.publication.fetch({
          forId: pubId,
        });
      } catch (e) {
        this.logInfo(e.message);
      }

      const {
        by: {
          handle: { localName },
        },
      } = result;

      const {
        mirrorOn: {
          by: {
            ownedBy: { address },
          },
        },
      } = result;

      let message = `🌿 Click to view the mirror! 🌿`;
      let title = `${localName} mirrored your post 👀`;
      this.sendNotificationHelper(title, message, address, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async quotePublished(payload: any) {
    try {
      let pubId = payload.serverPubId;

      let url = `https://hey.xyz/posts/${pubId}`; // change to quote addr, not post addr
      let result;

      try {
        result = await lensClient.publication.fetch({
          forId: pubId,
        });
      } catch (e) {
        this.logInfo(e.message);
      }

      const {
        by: {
          handle: { localName },
        },
      } = result;
      const {
        quoteOn: {
          by: {
            ownedBy: { address },
          },
        },
      } = result;

      let message = `🌿 Click to view the quote! 🌿 `;
      let title = `${localName} quoted your post 👀`;
      this.sendNotificationHelper(title, message, address, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async profileMentioned(payload: any) {
    try {
      let profileId = payload.profileId;
      let profileIdMentioned = payload.pubProfileIdPointed;
      let pubId = payload.serverPubIdPointer;
      const profileById = await lensClient.profile.fetch({
        forProfileId: profileId,
      });
      const mentionedProfile = await lensClient.profile.fetch({
        forProfileId: profileIdMentioned,
      });
      let ownerAddress = await profileById?.ownedBy.address;
      let mentionedHandle = await mentionedProfile?.handle.localName;
      let url = `https://hey.xyz/posts/${pubId}`;

      let message = `🌿 Click to view! 🌿`;
      let title = `${mentionedHandle} mentioned you 👀`;
      this.sendNotificationHelper(title, message, ownerAddress, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async publicationActed(payload: any) {
    try {
      let publicationActedProfileId =
        payload.publicationActionParams.publicationActedProfileId;
      let actorProfileId = payload.publicationActionParams.actorProfileId;
      let publicationActedId =
        payload.publicationActionParams.publicationActedId;
      let action = payload.publicationActionParams.actionModuleData;

      const publicationActedProfileIdById = await lensClient.profile.fetch({
        forProfileId: publicationActedProfileId,
      });

      const actorProfileIdById = await lensClient.profile.fetch({
        forProfileId: actorProfileId,
      });

      let handle = await actorProfileIdById?.handle;

      let ownerAddress = await publicationActedProfileIdById?.ownedBy.address;
      let url = `https://hey.xyz/posts/${publicationActedId}`;

      if (action == "Upvote") {
        let message = `🌿 Click to view the post! 🌿`;
        let title = `${handle?.localName} liked your post 👀`;
        this.sendNotificationHelper(title, message, ownerAddress, url);
      } else {
        let message = `🌿 Click to view the post! 🌿`;
        let title = `${handle?.localName} disliked your post 👀`;
        this.sendNotificationHelper(title, message, ownerAddress, url);
      }
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async publicationCollected(payload: any) {
    try {
      let collectedProfileId = payload.collectedProfileId;
      let collectedPubId = payload.collectedPubId;
      let collectorProfileId = payload.collectorProfileId;

      const collectedProfileIdById = await lensClient.profile.fetch({
        forProfileId: collectedProfileId,
      });
      const collectorProfileIdById = await lensClient.profile.fetch({
        forProfileId: collectorProfileId,
      });

      let handle = await collectorProfileIdById?.handle;

      let ownerAddress = await collectedProfileIdById?.ownedBy.address;

      let url = `https://hey.xyz/posts/${collectedPubId}`;

      let message = `🌿 Click to view the post! 🌿`;
      let title = `${handle?.localName} collected your post 👀`;
      this.sendNotificationHelper(title, message, ownerAddress, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async publicationReactionAdded(payload: any) {
    try {
      let serverPubId = payload.serverPubId;
      let profileId = serverPubId.split("-")[0];
      let actorProfileId = payload.profileId;
      let action = payload.type;

      const profileIdById = await lensClient.profile.fetch({
        forProfileId: profileId,
      });

      const actorProfileIdById = await lensClient.profile.fetch({
        forProfileId: actorProfileId,
      });

      let handle = await profileIdById?.handle;

      let ownerAddress = await profileIdById?.ownedBy.address;
      let url = `https://hey.xyz/posts/${serverPubId}`;

      if (action == "UPVOTE") {
        let message = `🌿 Click to view the post! 🌿`;
        let title = `${actorProfileIdById?.handle.localName} liked your post 👀`;
        this.sendNotificationHelper(title, message, ownerAddress, url);
      } else {
        let message = `🌿 Click to view the post! 🌿`;
        let title = `${actorProfileIdById?.handle.localName} disliked your post 👀`;
        this.sendNotificationHelper(title, message, ownerAddress, url);
      }
    } catch (e) {
      this.logInfo(e.message);
    }
  }
  public async profileFollowed(payload: any) {
    try {
      let followerProfileId = payload.followerProfileId;
      let idOfProfileFollowed = payload.idOfProfileFollowed;

      const idOfProfileFollowedById = await lensClient.profile.fetch({
        forProfileId: idOfProfileFollowed,
      });

      const followerProfileIdById = await lensClient.profile.fetch({
        forProfileId: followerProfileId,
      });

      let handle = await followerProfileIdById?.handle;

      let ownerAddress = await idOfProfileFollowedById?.ownedBy.address;
      let url = `https://hey.xyz/u/${handle?.localName}`;

      let message = `🌿 Click to view the profile! 🌿`;
      let title = `${handle?.localName} followed you 👀`;
      this.sendNotificationHelper(title, message, ownerAddress, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async profileUnFollowed(payload: any) {
    try {
      let unfollowerProfileId = payload.unfollowerProfileId;
      let idOfProfileUnfollowed = payload.idOfProfileUnfollowed;

      const idOfProfileUnfollowedById = await lensClient.profile.fetch({
        forProfileId: idOfProfileUnfollowed,
      });

      const unfollowerProfileIdById = await lensClient.profile.fetch({
        forProfileId: unfollowerProfileId,
      });

      let handle = await unfollowerProfileIdById?.handle;

      let ownerAddress = await idOfProfileUnfollowedById?.ownedBy.address;
      let url = `https://hey.xyz/u/${handle?.localName}`;

      let message = `🌿 You have been Un-Followed by <span color='red'>${handle?.localName}</span>. Click here to view the profile! 🌿`;
      let title = "Someone Un-followed you on lens 👀";
      this.sendNotificationHelper(title, message, ownerAddress, url);
    } catch (e) {
      this.logInfo(e.message);
    }
  }

  public async sendNotificationHelper(
    title: string,
    message: string,
    ownerAddress: any,
    url: string
  ) {
    {
      this.logInfo("***** --Sending Notification-- *****");
      this.logInfo(`Body is ${message}`);
      const provider = new ethers.providers.JsonRpcProvider(
        settings.providerUrl
      );
      const signer = new ethers.Wallet(
        keys.PRIVATE_KEY_NEW_STANDARD.PK,
        provider
      );
      try {
        const userAlice = await PushAPI.initialize(signer, {
          env: CONSTANTS.ENV.DEV,
        });
        message = message + `[timestamp: ${Math.floor(Date.now() / 1000)}]`;
        const sendNotifRes = await userAlice.channel.send([ownerAddress], {
          notification: {
            title: "Lens Notification",
            body: "Theres some Activity going on your lens",
          },
          payload: { title: title, body: message, cta: url },
          channel: "0x831Fda3157d05559E1326c98EE3232a3e06fFB2a",
        });
      } catch (e) {
        this.logError(e.message);
      }
    }
  }
}
