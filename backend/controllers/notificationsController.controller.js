import db from "../config/db.js";

export async function updateNotificationStatus(req,res){
    try{
        const notificationId = req.params.id;

        if(!notificationId){
            return res.status(400).json({message:"Notification Id is required"});
        }

        const [notification] = await db.query("SELECT * FROM notification WHERE notification_id = ?",[notificationId]);

        if(notification.length === 0){
            return res.status(404).json({message:"Notification not found"});
        }

        if(notification[0].notification_status === "unread"){
            await db.query("UPDATE notification SET notification_status = ? WHERE notification_id = ?",["read",notificationId]);
            res.status(200).json({message:"Notification updated successfully"});
        }else{
            res.status(200).json({message:"Notification already read"});
        }
        
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

// Backend - Keep getUnreadNotifications as it was (don't auto-mark as read)
export async function getUnreadNotifications(req,res){
    console.log("called")
    try{
        const userId = req.user.id;
        console.log("userId",userId)
        if(!userId){
            return res.status(400).json({message:"User Id is required"});
        }

        const [user] = await db.query("SELECT * FROM users WHERE id = ?",[userId]);
        if(user.length === 0){
            return res.status(404).json({message:"User not found"});
        }

        const [notifications] = await db.query("SELECT * FROM notification WHERE user_id = ? AND notification_status = 'unread' ORDER BY time DESC",[userId]);
        res.status(200).json(notifications);

    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

// Add new function to mark all user notifications as read
export async function markAllNotificationsAsRead(req,res){
    try{
        const userId = req.user.id;
        console.log("Marking all notifications as read for user:", userId)
        
        if(!userId){
            return res.status(400).json({message:"User Id is required"});
        }

        const [user] = await db.query("SELECT * FROM users WHERE id = ?",[userId]);
        if(user.length === 0){
            return res.status(404).json({message:"User not found"});
        }

        // Update all unread notifications for this user
        const [result] = await db.query(
            "UPDATE notification SET notification_status = 'read' WHERE user_id = ? AND notification_status = 'unread'",
            [userId]
        );
        
        console.log(`Marked ${result.affectedRows} notifications as read for user ${userId}`);
        res.status(200).json({
            message: "All notifications marked as read", 
            updatedCount: result.affectedRows
        });

    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}

export async function deleteNotification(req,res){
    try{
        const notificationId = req.params.id;

        if(!notificationId){
            return res.status(400).json({message:"Notification Id is required"});
        }

        const [notification] = await db.query("SELECT * FROM notification WHERE notification_id = ?",[notificationId]);

        if(notification.length === 0){
            return res.status(404).json({message:"Notification not found"});
        }

        await db.query("DELETE FROM notification WHERE notification_id = ?",[notificationId]);
        res.status(200).json({message:"Notification deleted successfully"});
        
    }catch(err){
        console.log(err);
        res.status(500).json({message:err.message});
    }
}